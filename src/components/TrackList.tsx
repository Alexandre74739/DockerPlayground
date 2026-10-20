"use client";

import { useState } from "react";
import { exerciseKey } from "@/lib/content";
import { type Progress, useProgress } from "@/lib/progress";
import type { Module } from "@/lib/types";
import { ModuleCard } from "./ModuleCard";
import { ResetProgressButton } from "./ResetProgressButton";
import { type CompletionFilter, FilterTabs, matchesFilter } from "./ui/FilterTabs";

type TrackModule = Pick<Module, "id" | "title" | "description" | "icon"> & { exerciseIds: string[]; position: number };

export type TrackSummary = { id: string; title: string; description: string; modules: TrackModule[] };

/** Un module est terminé quand tous ses exercices et son quiz sont faits. */
function moduleDone(progress: Progress, mod: TrackModule): boolean {
  return (
    mod.exerciseIds.every((id) => progress.completedExercises.includes(exerciseKey(mod.id, id))) &&
    progress.quizScores[mod.id] !== undefined
  );
}

/** Parcours de l'accueil : le filtre porte sur les modules de chaque parcours. */
export function TrackList({ tracks }: { tracks: TrackSummary[] }) {
  const progress = useProgress();
  const [filter, setFilter] = useState<CompletionFilter>("all");
  const isDone = (mod: TrackModule) => moduleDone(progress, mod);

  return (
    <div className="space-y-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs value={filter} onChange={setFilter} allLabel="Tous les modules" label="Filtrer les modules" />
        <ResetProgressButton />
      </div>

      {tracks.map((track, index) => {
        const done = track.modules.every(isDone);
        const shown = track.modules.filter((mod) => matchesFilter(filter, isDone(mod)));
        return (
          <section key={track.id}>
            <div className="mb-6">
              <h2 className="flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight text-ink-100">
                Parcours {index + 1} — {track.title}
                {done && (
                  <span className="rounded-full border border-neon-400/40 px-2.5 py-0.5 text-xs font-medium text-neon-400">Terminé</span>
                )}
              </h2>
              <p className="mt-1 text-sm text-ink-400">{track.description}</p>
            </div>
            {shown.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {shown.map((mod) => (
                  <ModuleCard key={mod.id} position={mod.position} mod={mod} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-ink-700 px-5 py-6 text-sm text-ink-400">
                {filter === "done"
                  ? "Aucun module terminé dans ce parcours pour l'instant : termine ses exercices et son quiz."
                  : "Tous les modules de ce parcours sont terminés."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
