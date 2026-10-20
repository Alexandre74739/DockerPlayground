"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import type { Module } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { ModuleIcon } from "./ui/ModuleIcon";

type ModuleCardProps = {
  mod: Pick<Module, "id" | "title" | "description" | "icon"> & { exerciseIds: string[] };
  position: number;
};

export function ModuleCard({ mod, position }: ModuleCardProps) {
  const { completedExercises, quizScores } = useProgress();
  const done = mod.exerciseIds.filter((id) => completedExercises.includes(exerciseKey(mod.id, id))).length;
  const quizScore = quizScores[mod.id];
  const complete = done === mod.exerciseIds.length && quizScore !== undefined;

  return (
    <Link
      href={`/modules/${mod.id}`}
      className="group flex flex-col rounded-xl border border-ink-800 bg-ink-850 p-5 transition-colors hover:border-ink-600"
    >
      <div className="flex items-center justify-between">
        <ModuleIcon name={mod.icon} className="h-5 w-5 text-ink-400 transition-colors group-hover:text-neon-400" />
        {complete ? (
          <Check className="h-4 w-4 text-neon-400" aria-label="Module terminé" />
        ) : (
          <span className="font-mono text-xs text-ink-500">{String(position).padStart(2, "0")}</span>
        )}
      </div>
      <h3 className="mt-5 font-medium text-ink-100">{mod.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-400">{mod.description}</p>
      <div className="mt-6 flex items-center gap-3">
        <ProgressBar value={done} max={mod.exerciseIds.length} className="flex-1" />
        <span className="font-mono text-xs tabular-nums text-ink-500">
          {done}/{mod.exerciseIds.length}
        </span>
      </div>
    </Link>
  );
}
