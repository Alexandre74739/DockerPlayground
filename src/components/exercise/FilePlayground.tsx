"use client";

import { Check, Circle, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { FileExercise } from "@/lib/types";
import { CodeEditor } from "../CodeEditor";
import { RichText } from "../RichText";
import { Button } from "../ui/Button";
import { Panel } from "./Panel";

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
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <Panel title="Consigne">
          <p className="px-4 pb-4 text-sm leading-relaxed text-ink-300">
            <RichText text={exercise.instruction} />
          </p>
        </Panel>

        <Panel
          title="Vérifications"
          aside={
            results && (
              <span className={`font-mono text-xs tabular-nums ${allPassed ? "text-neon-400" : "text-ink-500"}`}>
                {passed}/{exercise.checks.length}
              </span>
            )
          }
        >
          <ul className="space-y-2 px-4 pb-4 text-sm">
            {exercise.checks.map((check, index) => {
              const ok = results?.[index];
              const Icon = ok === undefined ? Circle : ok ? Check : X;
              return (
                <li key={check.label} className="flex items-center gap-2.5">
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${ok === undefined ? "text-ink-600" : ok ? "text-neon-400" : "text-danger"}`}
                    strokeWidth={ok === undefined ? 2 : 3}
                  />
                  <code className={`font-mono text-xs ${ok ? "text-ink-500" : "text-ink-300"}`}>{check.label}</code>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={verify}>
            Vérifier
          </Button>
          <Button onClick={() => setShowSolution((value) => !value)} aria-expanded={showSolution}>
            {showSolution ? "Masquer" : "Réponse"}
          </Button>
          <Button variant="ghost" onClick={reset} aria-label="Réinitialiser le fichier">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {showSolution && (
          <pre className="overflow-x-auto rounded-xl border border-ink-800 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-ink-200">
            {exercise.solution}
          </pre>
        )}
      </aside>

      <CodeEditor fileName={exercise.fileName} value={content} onChange={setContent} onSubmit={verify} />
    </div>
  );
}
