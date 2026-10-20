"use client";

import Link from "next/link";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import type { Module } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

type ModuleCardProps = {
  mod: Pick<Module, "id" | "title" | "description" | "icon"> & { exerciseIds: string[] };
  position: number;
};

export function ModuleCard({ mod, position }: ModuleCardProps) {
  const { completedExercises, quizScores } = useProgress();
  const done = mod.exerciseIds.filter((id) => completedExercises.includes(exerciseKey(mod.id, id))).length;
  const quizScore = quizScores[mod.id];
  const complete = done === mod.exerciseIds.length;

  return (
    <Link
      href={`/modules/${mod.id}`}
      className="group flex flex-col rounded-2xl border border-brand-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">{mod.icon}</span>
        <span className="text-xs font-medium text-brand-400">Module {position}</span>
      </div>
      <h3 className="mt-4 font-semibold text-brand-950 group-hover:text-brand-700">{mod.title}</h3>
      <p className="mt-1 flex-1 text-sm text-brand-900/70">{mod.description}</p>
      <div className="mt-4 space-y-2">
        <ProgressBar value={done} max={mod.exerciseIds.length} />
        <div className="flex justify-between text-xs text-brand-700">
          <span>
            {complete ? "✓ " : ""}
            {done}/{mod.exerciseIds.length} exercices
          </span>
          <span>{quizScore !== undefined ? `Quiz : ${quizScore}%` : "Quiz à faire"}</span>
        </div>
      </div>
    </Link>
  );
}
