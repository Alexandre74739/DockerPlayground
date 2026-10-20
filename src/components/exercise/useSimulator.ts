"use client";

import { useState } from "react";
import {
  complete,
  createState,
  execute,
  type ExecResult,
  type Prompt,
  promptFor,
  type SimState,
  type SimulatorSetup,
} from "@/lib/simulator";
import type { ActivePrompt, TerminalLine } from "../Terminal";

const WELCOME: TerminalLine[] = [
  { text: "Docker Desktop 4.35.1 — moteur 27.3.1 (simulé)" },
  { text: "Tape « help » pour la liste des commandes du terminal, « docker --help » pour l'aide Docker.\n" },
];

/** Ligne exécutée avec succès (ou en échec) dans le shell de l'hôte. */
export type CommandEvent = { line: string; result: ExecResult };

/**
 * Relie le simulateur Docker au terminal : état, historique d'affichage et
 * questions interactives (mot de passe, confirmation, Ctrl+C).
 */
export function useSimulator(setup: SimulatorSetup | undefined, onFinished: (event: CommandEvent) => void) {
  const [state, setState] = useState<SimState>(() => createState(setup));
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME);
  const [pending, setPending] = useState<{ prompt: Prompt; line: string } | null>(null);

  const activePrompt: ActivePrompt = pending
    ? pending.prompt.blocking
      ? null
      : { text: pending.prompt.label.trimEnd(), kind: "question", mask: pending.prompt.mask }
    : { text: promptFor(state), kind: "shell" };

  function apply(result: ExecResult, line: string) {
    setState(result.state);
    if (result.output) setLines((previous) => [...previous, { text: result.output }]);
    if (result.prompt) setPending({ prompt: result.prompt, line });
    else {
      setPending(null);
      onFinished({ line, result });
    }
    return result;
  }

  function submit(value: string) {
    if (pending?.prompt.blocking) {
      setLines((previous) => [...previous, { text: value }]);
      return;
    }
    if (pending) {
      const label = pending.prompt.label;
      setLines((previous) => [...previous, { prompt: label.trimEnd(), text: pending.prompt.mask ? "" : value }]);
      return apply(pending.prompt.respond(state, value), pending.line);
    }
    setLines((previous) => [...previous, { prompt: promptFor(state), text: value }]);
    if (!value.trim()) return;
    const result = execute(state, value);
    // Une commande au premier plan (logs -f…) compte dès son lancement.
    if (result.prompt?.blocking) onFinished({ line: value, result });
    apply(result, value);
  }

  function interrupt(value: string) {
    if (pending?.prompt.interrupt) {
      setLines((previous) => [...previous, { text: `${value}^C` }]);
      const result = pending.prompt.interrupt(state);
      setPending(null);
      setState(result.state);
      if (result.output) setLines((previous) => [...previous, { text: result.output }]);
      return;
    }
    const label = pending ? pending.prompt.label.trimEnd() : promptFor(state);
    setLines((previous) => [...previous, { prompt: label, text: `${pending?.prompt.mask ? "" : value}^C` }]);
    setPending(null);
  }

  function reset() {
    setState(createState(setup));
    setLines(WELCOME);
    setPending(null);
  }

  return {
    lines,
    activePrompt,
    title: state.shell
      ? `${state.containers.find((container) => container.id === state.shell?.containerId)?.name ?? "conteneur"} — ${state.shell.shell}`
      : promptFor(state).slice(0, -1),
    submit,
    interrupt,
    clear: () => setLines([]),
    complete: (value: string) => complete(state, value),
    reset,
  };
}
