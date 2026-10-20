"use client";

import { Check, KeyRound, Keyboard, Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import { validatesStep } from "@/lib/step-validation";
import type { CommandExercise } from "@/lib/types";
import { RichText } from "../RichText";
import { Terminal } from "../Terminal";
import { Button } from "../ui/Button";
import { type CommandEvent, useSimulator } from "./useSimulator";

type CommandPlaygroundProps = {
  exercise: CommandExercise;
  onComplete: () => void;
};

const SHORTCUTS = [
  ["↑ / ↓", "historique des commandes"],
  ["Tab", "compléter un nom"],
  ["Ctrl + C", "interrompre (logs -f, attaché…)"],
  ["Ctrl + L", "effacer l'écran"],
  ["Clic droit", "coller (ou copier la sélection)"],
];

export function CommandPlayground({ exercise, onComplete }: CommandPlaygroundProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reveal, setReveal] = useState<{ hint: boolean; solution: boolean }>({ hint: false, solution: false });
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
    setReveal({ hint: false, solution: false });
    setStepIndex(stepIndex + 1);
    if (stepIndex + 1 === steps.length) onComplete();
  }

  const terminal = useSimulator(exercise.setup, handleFinished);

  function restart() {
    terminal.reset();
    setStepIndex(0);
    setReveal({ hint: false, solution: false });
    setLastMiss(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <section className="rounded-xl border border-ink-700 bg-ink-850">
          <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">Mission</h2>
            <span className="font-mono text-xs text-ink-400">
              <span className="text-neon-400">{Math.min(stepIndex, steps.length)}</span>/{steps.length}
            </span>
          </header>
          <ol className="divide-y divide-ink-800">
            {steps.map((current, index) => {
              const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
              return (
                <li key={index} className={`flex gap-3 px-4 py-3.5 ${state === "current" ? "bg-ink-800/60" : ""}`}>
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                      state === "done"
                        ? "bg-azure-500 text-white"
                        : state === "current"
                          ? "bg-neon-400 text-ink-950"
                          : "border border-ink-600 text-ink-500"
                    }`}
                  >
                    {state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-relaxed">
                    {state === "todo" ? (
                      <p className="text-ink-500">Étape {index + 1}</p>
                    ) : (
                      <p className={state === "current" ? "text-ink-100" : "text-ink-400"}>
                        <RichText text={current.instruction} />
                      </p>
                    )}
                    {state === "done" && <code className="mt-1 block truncate font-mono text-xs text-azure-300">$ {current.solution}</code>}
                    {state === "current" && lastMiss && (
                      <p className="mt-2 text-xs text-ink-400">La dernière commande n&apos;a pas encore validé cette étape.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {finished && (
            <div className="flex items-center justify-between border-t border-ink-700 px-4 py-3">
              <p className="text-sm font-medium text-neon-400">Mission accomplie</p>
              <Button variant="ghost" onClick={restart} className="px-2 py-1 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </Button>
            </div>
          )}
        </section>

        {!finished && (
          <section className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-400">Besoin d&apos;un coup de main ?</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setReveal((value) => ({ ...value, hint: !value.hint }))} aria-expanded={reveal.hint}>
                <Lightbulb className="h-4 w-4 text-neon-400" /> {reveal.hint ? "Masquer l'aide" : "Afficher l'aide"}
              </Button>
              <Button onClick={() => setReveal((value) => ({ ...value, solution: !value.solution }))} aria-expanded={reveal.solution}>
                <KeyRound className="h-4 w-4 text-azure-400" /> {reveal.solution ? "Masquer" : "Voir la réponse"}
              </Button>
            </div>
            {reveal.hint && (
              <p className="mt-3 rounded-lg border-l-2 border-neon-400 bg-neon-950/40 px-3 py-2 text-sm text-ink-200">{step.hint}</p>
            )}
            {reveal.solution && (
              <code className="mt-3 block rounded-lg border-l-2 border-azure-400 bg-azure-950 px-3 py-2 font-mono text-sm text-azure-200">
                $ {step.solution}
              </code>
            )}
          </section>
        )}

        <details className="group rounded-xl border border-ink-700 bg-ink-850 p-4 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-400">
            <Keyboard className="h-4 w-4" /> Raccourcis du terminal
          </summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-200">{keys}</kbd>
                </dt>
                <dd className="text-ink-400">{label}</dd>
              </div>
            ))}
          </dl>
        </details>

        <Button variant="ghost" onClick={restart} className="self-start text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser l&apos;environnement
        </Button>
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
