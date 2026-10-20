"use client";

import { Check, CircleDashed, KeyRound, Play, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { FileExercise } from "@/lib/types";
import { CodeEditor } from "../CodeEditor";
import { RichText } from "../RichText";
import { Button } from "../ui/Button";

type FilePlaygroundProps = {
  exercise: FileExercise;
  onComplete: () => void;
};

export function FilePlayground({ exercise, onComplete }: FilePlaygroundProps) {
  const [content, setContent] = useState(exercise.starter);
  const [results, setResults] = useState<boolean[] | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const passed = results?.filter(Boolean).length ?? 0;
  const allPassed = results !== null && passed === exercise.checks.length;

  function verify() {
    const next = exercise.checks.map((check) => check.pattern.test(content));
    setResults(next);
    if (next.every(Boolean)) onComplete();
  }

  function reset() {
    setContent(exercise.starter);
    setResults(null);
    setShowSolution(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <section className="rounded-xl border border-ink-700 bg-ink-850 p-4">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-400">Mission</h2>
          <p className="text-sm leading-relaxed text-ink-100">
            <RichText text={exercise.instruction} />
          </p>
        </section>

        <section className="rounded-xl border border-ink-700 bg-ink-850">
          <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">Vérifications</h2>
            {results && (
              <span className="font-mono text-xs text-ink-400">
                <span className={allPassed ? "text-neon-400" : "text-ink-100"}>{passed}</span>/{exercise.checks.length}
              </span>
            )}
          </header>
          <ul className="space-y-2 px-4 py-3 text-sm">
            {exercise.checks.map((check, index) => {
              const ok = results?.[index];
              const Icon = ok === undefined ? CircleDashed : ok ? Check : X;
              return (
                <li key={check.label} className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${ok === undefined ? "text-ink-500" : ok ? "text-neon-400" : "text-rose-400"}`}
                    strokeWidth={ok ? 3 : 2}
                  />
                  <code className={`font-mono text-xs ${ok === false ? "text-ink-200" : "text-ink-300"}`}>{check.label}</code>
                </li>
              );
            })}
          </ul>
          {allPassed && <p className="border-t border-ink-700 px-4 py-3 text-sm font-medium text-neon-400">Fichier valide, bien joué !</p>}
        </section>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={verify}>
            <Play className="h-4 w-4" /> Vérifier
          </Button>
          <Button onClick={() => setShowSolution((value) => !value)} aria-expanded={showSolution}>
            <KeyRound className="h-4 w-4 text-azure-400" /> {showSolution ? "Masquer la réponse" : "Voir la réponse"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>

        {showSolution && (
          <pre className="overflow-x-auto rounded-xl border-l-2 border-azure-400 bg-azure-950 p-4 font-mono text-xs leading-relaxed text-azure-200">
            {exercise.solution}
          </pre>
        )}
      </aside>

      <CodeEditor fileName={exercise.fileName} value={content} onChange={setContent} onSubmit={verify} />
    </div>
  );
}
