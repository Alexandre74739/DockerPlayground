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

/** Parcours de l'accueil, filtrables selon leur avancement. */
export function TrackList({ tracks }: { tracks: TrackSummary[] }) {
  const progress = useProgress();
  const [filter, setFilter] = useState<Filter>("all");
  const isDone = (track: TrackSummary) => track.modules.every((mod) => moduleDone(progress, mod));
  const counts = { all: tracks.length, todo: tracks.filter((track) => !isDone(track)).length, done: tracks.filter(isDone).length };
  const visible = tracks.filter((track) => filter === "all" || (filter === "done") === isDone(track));
  const options: { id: Filter; label: string }[] = [
    { id: "all", label: "Tous les parcours" },
    { id: "todo", label: "À terminer" },
    { id: "done", label: "Terminés" },
  ];

  return (
    <div className="space-y-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex flex-wrap gap-1 rounded-lg border border-ink-800 bg-ink-850 p-1"
          role="radiogroup"
          aria-label="Filtrer les parcours"
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

      {visible.map((track) => {
        const index = tracks.indexOf(track);
        const done = isDone(track);
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {track.modules.map((mod) => (
                <ModuleCard key={mod.id} position={mod.position} mod={mod} />
              ))}
            </div>
          </section>
        );
      })}

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-700 py-10 text-center text-sm text-ink-400">
          {filter === "done"
            ? "Aucun parcours terminé pour l'instant : termine les exercices et le quiz de chaque module."
            : "Bravo, tous les parcours sont terminés !"}
        </p>
      )}
    </div>
  );
}
