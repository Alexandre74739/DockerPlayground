import type { CommandSpec, Parsed } from "./args";
import { cloneState } from "./state";
import type { ExecResult, Prompt, SimState } from "./types";

/** Résultat d'une commande avant conversion en ExecResult. */
export type Outcome = { out?: string; code?: number; prompt?: Prompt };

export type Ctx = { state: SimState; parsed: Parsed; command: string };

export type CommandDef = {
  /** Chemin de la commande, ex: "container ls". */
  path: string;
  aliases?: string[];
  spec: CommandSpec;
  run: (ctx: Ctx) => Outcome;
};

export const ok = (out = ""): Outcome => ({ out, code: 0 });
export const fail = (out: string, code = 1): Outcome => ({ out, code });
export const daemonError = (message: string, code = 1): Outcome => fail(`Error response from daemon: ${message}`, code);

export function finalize(state: SimState, outcome: Outcome): ExecResult {
  return { output: outcome.out ?? "", exitCode: outcome.code ?? 0, state, prompt: outcome.prompt };
}

/** Pose une question à l'utilisateur ; `handler` reçoit une copie de l'état. */
export function ask(label: string, handler: (state: SimState, answer: string) => Outcome, mask = false): Prompt {
  return {
    label,
    mask,
    respond: (state, answer) => {
      const next = cloneState(state);
      return finalize(next, handler(next, answer));
    },
  };
}

/** Demande de confirmation [y/N] des commandes prune. */
export function confirm(action: (state: SimState) => Outcome): Prompt {
  return ask("Are you sure you want to continue? [y/N] ", (state, answer) => {
    if (!/^y(es)?$/i.test(answer.trim())) return ok();
    return action(state);
  });
}

/** Processus au premier plan qui ne rend la main qu'avec Ctrl+C. */
export function foreground(onInterrupt: (state: SimState) => Outcome = () => ({ code: 130 })): Prompt {
  return {
    label: "",
    blocking: true,
    respond: (state) => finalize(state, { prompt: foreground(onInterrupt) }),
    interrupt: (state) => {
      const next = cloneState(state);
      return finalize(next, onInterrupt(next));
    },
  };
}

export function join(...parts: (string | undefined | false)[]): string {
  return parts.filter((part) => part !== undefined && part !== false).join("\n");
}
