"use client";

import { totalExercises } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";

export function GlobalProgress() {
  const { completedExercises } = useProgress();
  const done = completedExercises.length;
  return (
    <div className="flex items-center gap-3 text-xs text-brand-800">
      <ProgressBar value={done} max={totalExercises} className="w-32" />
      <span className="tabular-nums">
        {done}/{totalExercises} exercices
      </span>
    </div>
  );
}
