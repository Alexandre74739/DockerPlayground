"use client";

import { totalExercises } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";

export function GlobalProgress() {
  const { completedExercises } = useProgress();
  const done = completedExercises.length;
  return (
    <div className="flex items-center gap-3 font-mono text-xs text-ink-400">
      <ProgressBar value={done} max={totalExercises} className="w-28" tone="neon" />
      <span className="tabular-nums">
        <span className="text-ink-100">{done}</span>/{totalExercises}
      </span>
    </div>
  );
}
