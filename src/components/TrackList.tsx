"use client";

import { useState } from "react";
import { exerciseKey } from "@/lib/content";
import { type Progress, useProgress } from "@/lib/progress";
import type { Module } from "@/lib/types";
import { ModuleCard } from "./ModuleCard";
import { ResetProgressButton } from "./ResetProgressButton";

type TrackModule = Pick<Module, "id" | "title" | "description" | "icon"> & { exerciseIds: string[]; position: number };

export type TrackSummary = { id: string; title: string; description: string; modules: TrackModule[] };

type Filter = "all" | "todo" | "done";

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
  const [filter, setFilter] = useState<Filter>("all");
  const isDone = (mod: TrackModule) => moduleDone(progress, mod);
  const matches = (mod: TrackModule) => filter === "all" || (filter === "done") === isDone(mod);
  const allModules = tracks.flatMap((track) => track.modules);
  const counts = { all: allModules.length, todo: allModules.filter((mod) => !isDone(mod)).length, done: allModules.filter(isDone).length };
  const options: { id: Filter; label: string }[] = [
    { id: "all", label: "Tous les modules" },
    { id: "todo", label: "À terminer" },
    { id: "done", label: "Terminés" },
  ];

  return (
    <div className="space-y-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex flex-wrap gap-1 rounded-lg border border-ink-800 bg-ink-850 p-1"
          role="radiogroup"
          aria-label="Filtrer les modules"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${filter === option.id ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
            >
              {option.label}
              <span className={`font-mono text-xs ${filter === option.id ? "text-neon-400" : "text-ink-500"}`}>{counts[option.id]}</span>
            </button>
          ))}
        </div>
        <ResetProgressButton />
      </div>

      {tracks.map((track, index) => {
        const done = track.modules.every(isDone);
        const shown = track.modules.filter(matches);
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
