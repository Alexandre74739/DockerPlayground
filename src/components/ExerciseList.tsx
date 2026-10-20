"use client";

import Link from "next/link";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";

type ExerciseListProps = {
  moduleId: string;
  exercises: { id: string; title: string; kind: "command" | "file" }[];
  quizCount: number;
};

export function ExerciseList({ moduleId, exercises, quizCount }: ExerciseListProps) {
  const { completedExercises, quizScores } = useProgress();
  const quizScore = quizScores[moduleId];

  return (
    <ol className="space-y-3">
      {exercises.map((exercise, index) => {
        const done = completedExercises.includes(exerciseKey(moduleId, exercise.id));
        return (
          <li key={exercise.id}>
            <Link
              href={`/modules/${moduleId}/exercices/${exercise.id}`}
              className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  done ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-brand-950">{exercise.title}</p>
                <p className="text-xs text-brand-600">
                  {exercise.kind === "command" ? "⌨️ Terminal" : "📝 Éditeur de fichier"}
                </p>
              </div>
              <span className="text-brand-400">→</span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link
          href={`/modules/${moduleId}/quiz`}
          className="flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50 p-4 transition hover:border-brand-400"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm text-white">?</span>
          <div className="flex-1">
            <p className="font-medium text-brand-950">Quiz du module</p>
            <p className="text-xs text-brand-600">
              {quizCount} questions{quizScore !== undefined ? ` · meilleur score : ${quizScore}%` : ""}
            </p>
          </div>
          <span className="text-brand-400">→</span>
        </Link>
      </li>
    </ol>
  );
}
