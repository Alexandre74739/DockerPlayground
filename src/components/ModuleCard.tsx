"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import type { Module } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { ModuleIcon } from "./ui/ModuleIcon";

type ModuleCardProps = {
  mod: Pick<Module, "id" | "title" | "description" | "icon"> & { exerciseIds: string[]; videoCount: number };
  position: number;
};

export function ModuleCard({ mod, position }: ModuleCardProps) {
  const { completedExercises, quizScores, lessonsRead } = useProgress();
  const done = mod.exerciseIds.filter((id) => completedExercises.includes(exerciseKey(mod.id, id))).length;
  const quizScore = quizScores[mod.id];
  const complete = done === mod.exerciseIds.length && quizScore !== undefined;

  return (
    <Link
      href={`/modules/${mod.id}`}
      className="group relative flex flex-col rounded-2xl border border-ink-700 bg-ink-850 p-5 transition hover:-translate-y-0.5 hover:border-ink-500 hover:bg-ink-800"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-950 text-azure-400 ring-1 ring-ink-700 transition group-hover:text-neon-400">
          <ModuleIcon name={mod.icon} className="h-5 w-5" />
        </span>
        <span className="font-mono text-2xl font-semibold text-ink-700 transition group-hover:text-ink-600">
          {String(position).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-4 flex items-center gap-1.5 font-semibold text-white">
        {mod.title}
        <ArrowUpRight className="h-4 w-4 text-ink-500 opacity-0 transition group-hover:opacity-100" />
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-400">{mod.description}</p>
      <div className="mt-5 space-y-2.5">
        <ProgressBar value={done} max={mod.exerciseIds.length} tone={complete ? "neon" : "azure"} />
        <div className="flex items-center justify-between font-mono text-[11px] text-ink-400">
          <span className="flex items-center gap-1">
            {lessonsRead.includes(mod.id) && <Check className="h-3 w-3 text-neon-400" />}
            cours · {mod.videoCount} vidéos
          </span>
          <span>
            {done}/{mod.exerciseIds.length} ex. · {quizScore !== undefined ? <span className="text-neon-400">{quizScore}%</span> : "quiz"}
          </span>
        </div>
      </div>
    </Link>
  );
}
