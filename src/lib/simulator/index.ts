import { tokenize } from "../command-parser";
import { ask, fail, finalize, ok, type Outcome } from "./command";
import { activate, current, dockerAccessError, homeOf, onEngine } from "./machines";
import { runDocker } from "./registry";
import {
  disconnect,
  downloadInstaller,
  installDocker,
  isInstallerScript,
  newgrp,
  scp,
  ssh,
  sshCopyId,
  sshKeygen,
  ufw,
  usermod,
} from "./remote";
import { reconcile } from "./runtime";
import { hostPrompt, runHostCommand, runInContainer, runSessionLine, sessionPrompt } from "./shell";
import { cloneState, createState, type SimulatorSetup } from "./state";
import type { ExecResult, SimState } from "./types";

export { createState, type SimulatorSetup } from "./state";
export { resolveHost } from "./runtime";
export { runHostCommand } from "./shell";
export type { ExecResult, Prompt, SimState } from "./types";

type Segment = { argv: string[]; operator: "&&" | ";" | null };

/** Découpe une ligne sur les opérateurs `&&` et `;`. */
function splitChain(tokens: string[]): Segment[] {
  const segments: Segment[] = [{ argv: [], operator: null }];
  for (const token of tokens) {
    if (token === "&&" || token === ";") segments.push({ argv: [], operator: token });
    else segments.at(-1)!.argv.push(token);
  }
  return segments.filter((segment) => segment.argv.length > 0);
}

/** Exécute une ligne saisie dans le terminal et renvoie la sortie et le nouvel état. */
export function execute(state: SimState, line: string): ExecResult {
  const result = executeLine(state, line);
  reconcile(result.state, (container, argv) => runInContainer(result.state, container, argv));
  return result;
}

/** Répond automatiquement aux questions d'une commande de préparation. */
function settle(result: ExecResult): SimState {
  let current = result;
  while (current.prompt) {
    if (current.prompt.blocking) return current.prompt.interrupt!(current.state).state;
    current = current.prompt.respond(current.state, "y");
  }
  return current.state;
}

/** Environnement initial d'un exercice, y compris les commandes de préparation. */
export function createEnvironment(setup: SimulatorSetup = {}): SimState {
  let state = createState(setup);
  const prepare = (command: string) => {
    const result = execute(state, command);
    if (result.exitCode !== 0 && !result.prompt) throw new Error(`Préparation impossible (${command}) :\n${result.output}`);
    state = settle(result);
  };
  for (const [id, machine] of Object.entries(setup.machines ?? {})) {
    if (!machine.commands?.length) continue;
    activate(state, id);
    machine.commands.forEach(prepare);
    activate(state, "local");
  }
  (setup.commands ?? []).forEach(prepare);
  return state;
}

function executeLine(state: SimState, line: string): ExecResult {
  const next = cloneState(state);
  if (next.shell) {
    const run = (target: SimState) => finalize(target, runSessionLine(target, line.trim(), tokenize(line)));
    return next.shell.machine && next.shell.machine !== next.machine ? onEngine(next, next.shell.machine, run) : run(next);
  }

  const outputs: string[] = [];
  let exitCode = 0;
  for (const { argv, operator } of splitChain(tokenize(line))) {
    if (operator === "&&" && exitCode !== 0) break;
    const outcome = runPipeline(next, argv);
    if (outcome.out) outputs.push(outcome.out);
    exitCode = outcome.code ?? 0;
    if (outcome.prompt) return { output: outputs.join("\n"), exitCode, state: next, prompt: outcome.prompt };
    if (next.shell) break;
  }
  return { output: outputs.join("\n"), exitCode, state: next };
}

/** Commandes enchaînées par && ou ; (utilisé par ssh serveur "cmd1 && cmd2"). */
function runChain(state: SimState, argv: string[]): Outcome {
  const outputs: string[] = [];
  let code = 0;
  for (const { argv: segment, operator } of splitChain(argv)) {
    if (operator === "&&" && code !== 0) break;
    const outcome = runPipeline(state, segment);
    if (outcome.out) outputs.push(outcome.out);
    code = outcome.code ?? 0;
    if (outcome.prompt) return { ...outcome, out: outputs.join("\n") };
  }
  return { out: outputs.join("\n"), code };
}

/** Tubes simples : … | grep, head, tail, wc -l ; curl https://get.docker.com | sh. */
function runPipeline(state: SimState, argv: string[]): Outcome {
  const stages: string[][] = [[]];
  for (const token of argv) {
    if (token === "|") stages.push([]);
    else stages.at(-1)!.push(token);
  }
  if (stages.length === 1) return runLine(state, argv, { root: false });

  const [first, ...rest] = stages;
  const installer = first[0] === "curl" && first.some((arg) => /get\.docker\.com/.test(arg));
  if (installer && rest.length === 1 && ["sh", "bash"].includes(rest[0].at(-1)!)) {
    return runLine(state, rest[0][0] === "sudo" ? ["sudo", "sh", INSTALLER] : ["sh", INSTALLER], { root: false });
  }
  let outcome = runLine(state, first, { root: false });
  for (const [program, ...args] of rest) {
    if (outcome.prompt) return outcome;
    const lines = (outcome.out ?? "").split("\n");
    const pattern = args.filter((arg) => !arg.startsWith("-"))[0] ?? "";
    const count = Number(args[args.indexOf("-n") + 1] ?? args.find((arg) => /^-\d+$/.test(arg))?.slice(1) ?? 10) || 10;
    switch (program) {
      case "grep": {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), args.includes("-i") ? "i" : "");
        const kept = lines.filter((text) => regex.test(text) !== args.includes("-v"));
        outcome = { out: kept.join("\n"), code: kept.length ? 0 : 1 };
        break;
      }
      case "head":
        outcome = { out: lines.slice(0, count).join("\n"), code: 0 };
        break;
      case "tail":
        outcome = { out: lines.slice(-count).join("\n"), code: 0 };
        break;
      case "wc":
        outcome = { out: String(outcome.out ? lines.length : 0), code: 0 };
        break;
      default:
        return fail(`bash: tube vers « ${program} » non simulé dans ce terminal d'entraînement`, 1);
    }
  }
  return outcome;
}

const INSTALLER = "__get-docker__";

/** Une commande, éventuellement précédée de VAR=valeur ou lancée avec sudo. */
function runLine(state: SimState, rawArgv: string[], options: { root: boolean }): Outcome {
  let argv = rawArgv.map((token) => token.replace(/\$\{?USER\}?/g, state.user).replace(/\$\{?HOME\}?/g, homeOf(state.user)));
  const env: Record<string, string> = {};
  while (argv[0] && /^[A-Z_][A-Z0-9_]*=/.test(argv[0])) {
    const [name, ...value] = argv[0].split("=");
    env[name] = value.join("=");
    argv = argv.slice(1);
  }
  if (argv.length === 0) return ok();
  const [program, ...args] = argv;
  const root = options.root || state.user === "root";

  switch (program) {
    case "sudo":
      return sudo(state, args);
    case "docker":
    case "docker-compose": {
      const error = dockerAccessError(state, root);
      if (error) return fail(error, current(state).dockerInstalled ? 1 : 127);
      const dockerArgs = program === "docker" ? args : ["compose", ...args];
      return runDocker(state, env.DOCKER_HOST ? ["-H", env.DOCKER_HOST, ...dockerArgs] : dockerArgs);
    }
    case "ssh":
      return ssh(state, args, (target, command) => runChain(target, command));
    case "scp":
      return scp(state, args);
    case "ssh-keygen":
      return sshKeygen(state, args);
    case "ssh-copy-id":
      return sshCopyId(state, args);
    case "usermod":
      return usermod(state, args, root);
    case "newgrp":
      return newgrp(state, args);
    case "ufw":
      return ufw(state, args, root);
    case "apt":
    case "apt-get":
      if (args[0] === "install" && args.includes("docker.io")) return installDocker(state, root, "apt");
      if (args[0] === "update")
        return root
          ? ok("Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nReading package lists... Done")
          : fail("E: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)", 100);
      return fail(`apt : seules « apt update » et « apt install docker.io » sont simulées ici.`, 100);
    case "sh":
    case "bash":
      if (args[0] === INSTALLER || (args[0] && isInstallerScript(state, args[0]))) return installDocker(state, root, "script");
      return args[0] ? fail(`${program}: 0: cannot open ${args[0]}: No such file`, 2) : ok();
    case "curl":
      return downloadInstaller(state, args) ?? runHostCommand(state, argv);
    case "exit":
    case "logout":
      return state.sshStack.length ? disconnect(state) : ok();
    default:
      return runHostCommand(state, argv);
  }
}

function sudo(state: SimState, args: string[]): Outcome {
  if (args.length === 0) return fail("usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command", 1);
  const run = (target: SimState) => runLine(target, args, { root: true });
  const machine = current(state);
  if (state.user === "root" || machine.sudoCached) return run(state);
  return {
    prompt: ask(
      `[sudo] password for ${state.user}: `,
      (next, answer) => {
        if (answer !== current(next).password) return fail("Sorry, try again.\nsudo: 1 incorrect password attempt", 1);
        current(next).sudoCached = true;
        return run(next);
      },
      true,
    ),
  };
}

/** Invite affichée devant la saisie (hôte ou shell de conteneur). */
export function promptFor(state: SimState): string {
  return state.shell ? sessionPrompt(state) : hostPrompt(state);
}

export { complete } from "./complete";
