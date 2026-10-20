"use client";

import { useState } from "react";
import { matchCommand } from "@/lib/command-parser";
import type { CommandExercise } from "@/lib/types";
import { RichText } from "../RichText";
import { Terminal, type TerminalLine } from "../Terminal";

type CommandPlaygroundProps = {
  exercise: CommandExercise;
  onComplete: () => void;
};

const WELCOME: TerminalLine[] = [
  { kind: "info", text: "Terminal Docker simulé. Tape ta commande puis Entrée." },
  { kind: "info", text: "Commandes utiles : indice, solution, clear (↑/↓ pour l'historique)." },
];

export function CommandPlayground({ exercise, onComplete }: CommandPlaygroundProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reveal, setReveal] = useState<"hint" | "solution" | null>(null);
  const { steps } = exercise;
  const finished = stepIndex >= steps.length;
  const step = steps[stepIndex];

  function advance() {
    setReveal(null);
    setStepIndex((index) => index + 1);
    if (stepIndex + 1 === steps.length) onComplete();
  }

  function handleCommand(command: string): TerminalLine[] {
    const lower = command.toLowerCase();
    if (finished) return [{ kind: "info", text: "Exercice terminé ! Passe au suivant ou recommence." }];
    if (lower === "indice" || lower === "hint") return [{ kind: "info", text: `💡 ${step.hint}` }];
    if (lower === "solution") return [{ kind: "info", text: `🔑 ${step.solution}` }];

    const program = command.split(/\s+/)[0];
    if (program !== "docker" && program !== "docker-compose") {
      return [
        { kind: "error", text: `bash: ${program}: commande introuvable dans ce terminal d'entraînement` },
        { kind: "info", text: "Les commandes commencent par « docker »." },
      ];
    }

    const result = matchCommand(command, step.rule);
    if (!result.ok) return [{ kind: "error", text: `✗ ${result.reason}` }];

    advance();
    const lines: TerminalLine[] = step.output ? [{ kind: "output", text: step.output }] : [];
    const isLast = stepIndex + 1 === steps.length;
    lines.push({ kind: "success", text: isLast ? "✓ Bravo, exercice terminé !" : "✓ Correct ! Étape suivante →" });
    return lines;
  }

  function restart() {
    setStepIndex(0);
    setReveal(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ol className="space-y-3">
        {steps.map((current, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
          return (
            <li
              key={index}
              className={`rounded-xl border p-4 transition ${
                state === "current"
                  ? "border-brand-400 bg-white shadow-md shadow-brand-100"
                  : state === "done"
                    ? "border-brand-100 bg-brand-50/60"
                    : "border-brand-100 bg-white opacity-60"
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    state === "done" ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {state === "done" ? "✓" : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={state === "current" ? "font-medium text-brand-950" : "text-brand-900/80"}>
                    {state === "todo" ? `Étape ${index + 1}` : <RichText text={current.instruction} />}
                  </p>
                  {state === "done" && (
                    <code className="mt-1 block truncate font-mono text-xs text-brand-600">{current.solution}</code>
                  )}
                  {state === "current" && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReveal("hint")}
                          className="rounded-md border border-brand-200 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-50"
                        >
                          💡 Indice
                        </button>
                        <button
                          type="button"
                          onClick={() => setReveal("solution")}
                          className="rounded-md border border-brand-200 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-50"
                        >
                          🔑 Solution
                        </button>
                      </div>
                      {reveal === "hint" && <p className="text-sm text-brand-700">{current.hint}</p>}
                      {reveal === "solution" && (
                        <code className="block rounded-md bg-brand-50 px-2 py-1 font-mono text-sm text-brand-800">
                          {current.solution}
                        </code>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {finished && (
          <button type="button" onClick={restart} className="text-sm text-brand-600 hover:underline">
            ↺ Recommencer l&apos;exercice
          </button>
        )}
      </ol>

      <Terminal
        onCommand={handleCommand}
        welcome={WELCOME}
        placeholder={finished ? "Exercice terminé 🎉" : "docker …"}
      />
    </div>
  );
}
