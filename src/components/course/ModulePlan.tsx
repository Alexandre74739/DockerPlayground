"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";

type ModulePlanProps = {
  moduleId: string;
  outline: { id: string; title: string }[];
  exercises: { id: string; title: string }[];
  quizCount: number;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-500">{title}</p>
      {children}
    </div>
  );
}

const itemClass = "block rounded-md px-2.5 py-1.5 text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100";

/** Sommaire latéral d'un module : cours, pratique, quiz et ressources. */
export function ModulePlan({ moduleId, outline, exercises, quizCount }: ModulePlanProps) {
  const { completedExercises, quizScores } = useProgress();
  const quizScore = quizScores[moduleId];

  return (
    <nav className="space-y-7 text-sm" aria-label="Plan du module">
      <Group title="Cours">
        <ul>
          {[...outline, { id: "videos", title: "En vidéo" }, { id: "aller-plus-loin", title: "Aller plus loin" }].map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className={itemClass}>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Exercices">
        <ol>
          {exercises.map((exercise, index) => {
            const done = completedExercises.includes(exerciseKey(moduleId, exercise.id));
            return (
              <li key={exercise.id}>
                <Link href={`/modules/${moduleId}/exercices/${exercise.id}`} className={`${itemClass} flex items-center gap-2.5`}>
                  <span className="w-4 shrink-0 font-mono text-xs text-ink-500">
                    {done ? <Check className="h-3.5 w-3.5 text-neon-400" strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span className="leading-snug">{exercise.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Group>

      <Group title="Évaluation">
        <Link href={`/modules/${moduleId}/quiz`} className={`${itemClass} flex items-center justify-between`}>
          <span>Quiz · {quizCount} questions</span>
          {quizScore !== undefined && <span className="font-mono text-xs text-neon-400">{quizScore}%</span>}
        </Link>
      </Group>
    </nav>
  );
}
