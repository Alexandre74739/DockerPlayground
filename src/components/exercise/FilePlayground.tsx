"use client";

import { useState } from "react";
import type { FileExercise } from "@/lib/types";
import { CodeEditor } from "../CodeEditor";
import { RichText } from "../RichText";

type FilePlaygroundProps = {
  exercise: FileExercise;
  onComplete: () => void;
};

export function FilePlayground({ exercise, onComplete }: FilePlaygroundProps) {
  const [content, setContent] = useState(exercise.starter);
  const [results, setResults] = useState<boolean[] | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const allPassed = results?.every(Boolean) ?? false;

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-400 bg-white p-4 shadow-md shadow-brand-100">
          <p className="font-medium text-brand-950">
            <RichText text={exercise.instruction} />
          </p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Points vérifiés</h2>
          <ul className="space-y-1.5 text-sm">
            {exercise.checks.map((check, index) => {
              const passed = results?.[index];
              return (
                <li key={check.label} className="flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] ${
                      passed === undefined
                        ? "bg-brand-50 text-brand-300"
                        : passed
                          ? "bg-brand-600 text-white"
                          : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {passed === undefined ? "•" : passed ? "✓" : "✗"}
                  </span>
                  <code className="font-mono text-brand-800">{check.label}</code>
                </li>
              );
            })}
          </ul>
          {results && !allPassed && (
            <p className="mt-3 text-sm text-rose-600">Certains points ne sont pas encore validés. Corrige et vérifie à nouveau.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={verify}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Vérifier mon fichier
          </button>
          <button
            type="button"
            onClick={() => setShowSolution((value) => !value)}
            className="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            {showSolution ? "Masquer la solution" : "🔑 Voir la solution"}
          </button>
          <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm text-brand-600 hover:bg-brand-50">
            ↺ Réinitialiser
          </button>
        </div>

        {showSolution && (
          <pre className="overflow-x-auto rounded-xl bg-brand-50 p-4 font-mono text-sm text-brand-900">{exercise.solution}</pre>
        )}
      </div>

      <CodeEditor fileName={exercise.fileName} value={content} onChange={setContent} />
    </div>
  );
}
