"use client";

import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { validatesStep } from "@/lib/step-validation";
import type { CommandExercise } from "@/lib/types";
import { RichText } from "../RichText";
import { Terminal } from "../Terminal";
import { Button } from "../ui/Button";
import { Panel } from "./Panel";
import { type CommandEvent, useSimulator } from "./useSimulator";

type CommandPlaygroundProps = {
  exercise: CommandExercise;
  onComplete: () => void;
};

const SHORTCUTS = [
  ["↑ ↓", "Historique"],
  ["Tab", "Compléter"],
  ["Ctrl C", "Interrompre"],
  ["Ctrl L", "Effacer l'écran"],
  ["Clic droit", "Coller / copier"],
];

export function CommandPlayground({ exercise, onComplete }: CommandPlaygroundProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reveal, setReveal] = useState<"hint" | "solution" | null>(null);
  const [lastMiss, setLastMiss] = useState(false);
  const { steps } = exercise;
  const finished = stepIndex >= steps.length;
  const step = steps[stepIndex];

  // La validation est silencieuse : le terminal ne fait que répondre comme un vrai terminal.
  function handleFinished({ line, result }: CommandEvent) {
    if (finished) return;
    const matches = validatesStep(step, line, result);
    setLastMiss(!matches);
    if (!matches) return;
    setReveal(null);
    setStepIndex(stepIndex + 1);
    if (stepIndex + 1 === steps.length) onComplete();
  }

  const terminal = useSimulator(exercise.setup, handleFinished);

  function restart() {
    terminal.reset();
    setStepIndex(0);
    setReveal(null);
    setLastMiss(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <Panel
          title="Étapes"
          aside={
            <span className="font-mono text-xs tabular-nums text-ink-500">
              {Math.min(stepIndex, steps.length)}/{steps.length}
            </span>
          }
        >
          <ol className="px-2 pb-2">
            {steps.map((current, index) => {
              const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
              return (
                <li key={index} className={`flex gap-3 rounded-lg px-2 py-2.5 ${state === "current" ? "bg-ink-800" : ""}`}>
                  <span
                    className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                      state === "done"
                        ? "bg-neon-400 text-ink-950"
                        : state === "current"
                          ? "border border-neon-400 text-neon-400"
                          : "border border-ink-600 text-ink-500"
                    }`}
                  >
                    {state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-relaxed">
                    {state === "todo" ? (
                      <p className="text-ink-500">Étape {index + 1}</p>
                    ) : (
                      <p className={state === "current" ? "text-ink-100" : "text-ink-500"}>
                        <RichText text={current.instruction} />
                      </p>
                    )}
                    {state === "current" && lastMiss && (
                      <p className="mt-1.5 text-xs text-ink-500">La dernière commande ne valide pas encore cette étape.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {finished && (
            <div className="flex items-center justify-between border-t border-ink-800 px-4 py-3">
              <p className="text-sm font-medium text-neon-400">Exercice terminé</p>
              <Button variant="ghost" size="sm" onClick={restart}>
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </Button>
            </div>
          )}
        </Panel>

        {!finished && (
          <Panel title="Aide">
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setReveal(reveal === "hint" ? null : "hint")}
                  aria-expanded={reveal === "hint"}
                >
                  Indice
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setReveal(reveal === "solution" ? null : "solution")}
                  aria-expanded={reveal === "solution"}
                >
                  Réponse
                </Button>
              </div>
              {reveal === "hint" && <p className="mt-3 text-sm leading-relaxed text-ink-300">{step.hint}</p>}
              {reveal === "solution" && (
                <code className="mt-3 block rounded-md bg-ink-950 px-3 py-2 font-mono text-[13px] text-neon-400">{step.solution}</code>
              )}
            </div>
          </Panel>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-1 text-xs">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt>
                <kbd className="rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">{keys}</kbd>
              </dt>
              <dd className="text-ink-500">{label}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center gap-1.5 self-start px-1 text-xs text-ink-500 transition-colors hover:text-ink-100"
        >
          <RotateCcw className="h-3 w-3" /> Réinitialiser l&apos;environnement
        </button>
      </aside>

      <Terminal
        title={terminal.title}
        lines={terminal.lines}
        prompt={terminal.activePrompt}
        onSubmit={terminal.submit}
        onInterrupt={terminal.interrupt}
        onClear={terminal.clear}
        onComplete={terminal.complete}
      />
    </div>
  );
}
