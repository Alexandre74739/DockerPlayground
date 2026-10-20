"use client";

import { totalExercises } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";

export function GlobalProgress() {
  const { completedExercises } = useProgress();
  const done = completedExercises.length;
  return (
    <div className="flex items-center gap-3 text-xs text-ink-400">
      <span>Progression</span>
      <ProgressBar value={done} max={totalExercises} className="w-24" />
      <span className="font-mono tabular-nums text-ink-300">
        {done}/{totalExercises}
      </span>
    </div>
  );
}
