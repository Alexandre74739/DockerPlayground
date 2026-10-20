import { tokenize } from "../command-parser";
import { finalize } from "./command";
import { runDocker } from "./registry";
import { reconcile } from "./runtime";
import { hostPrompt, runHostCommand, runInContainer, runSessionLine, sessionPrompt } from "./shell";
import { cloneState, createState, type SimulatorSetup } from "./state";
import type { ExecResult, SimState } from "./types";

export { createState, type SimulatorSetup } from "./state";
export { resolveHost } from "./runtime";
export { runHostCommand } from "./shell";
export type { ExecResult, Prompt, SimState } from "./types";

/** Découpe une ligne sur les opérateurs `&&` et `;`. */
function splitChain(tokens: string[]): { argv: string[]; operator: "&&" | ";" | null }[] {
  const segments: { argv: string[]; operator: "&&" | ";" | null }[] = [{ argv: [], operator: null }];
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

/** Environnement initial d'un exercice, y compris les commandes de préparation (setup.commands). */
export function createEnvironment(setup: SimulatorSetup = {}): SimState {
  let state = createState(setup);
  for (const command of setup.commands ?? []) {
    const result = execute(state, command);
    if (result.exitCode !== 0 && !result.prompt?.blocking) throw new Error(`Préparation impossible (${command}) :\n${result.output}`);
    state = result.prompt?.blocking ? result.prompt.interrupt!(result.state).state : result.state;
  }
  return state;
}

function executeLine(state: SimState, line: string): ExecResult {
  const next = cloneState(state);
  if (next.shell) return finalize(next, runSessionLine(next, line.trim(), tokenize(line)));

  const outputs: string[] = [];
  let exitCode = 0;
  for (const { argv, operator } of splitChain(tokenize(line))) {
    if (operator === "&&" && exitCode !== 0) break;
    const [program, ...args] = argv;
    const outcome =
      program === "docker"
        ? runDocker(next, args)
        : program === "docker-compose"
          ? runDocker(next, ["compose", ...args])
          : runHostCommand(next, argv);
    if ("out" in outcome && outcome.out) outputs.push(outcome.out);
    exitCode = outcome.code ?? 0;
    if ("prompt" in outcome && outcome.prompt) return { output: outputs.join("\n"), exitCode, state: next, prompt: outcome.prompt };
    if (next.shell) break;
  }
  return { output: outputs.join("\n"), exitCode, state: next };
}

/** Invite affichée devant la saisie (hôte ou shell de conteneur). */
export function promptFor(state: SimState): string {
  return state.shell ? sessionPrompt(state) : hostPrompt(state);
}

export { complete } from "./complete";
