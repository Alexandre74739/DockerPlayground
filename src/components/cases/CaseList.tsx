"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress";
import { type CompletionFilter, FilterTabs, matchesFilter } from "../ui/FilterTabs";
import { CaseCard } from "./CaseCard";

export type CaseSummary = { id: string; title: string; level: string; duration: string; skills: string[]; summary: string };

/** Cas pratiques par niveau ; un cas est terminé quand son meilleur score atteint 100/100. */
export function CaseList({ cases, levels }: { cases: CaseSummary[]; levels: string[] }) {
  const results = useProgress().caseResults;
  const [filter, setFilter] = useState<CompletionFilter>("all");
  const isDone = (id: string) => results[id]?.bestScore === 100;

  return (
    <div className="space-y-16">
      <FilterTabs value={filter} onChange={setFilter} allLabel="Tous les cas pratiques" label="Filtrer les cas pratiques" />

      {levels.map((level) => {
        const shown = cases.filter((practice) => practice.level === level && matchesFilter(filter, isDone(practice.id)));
        return (
          <section key={level}>
            <h2 className="mb-5 text-xl font-semibold tracking-tight text-ink-100">{level}</h2>
            {shown.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shown.map((practice) => (
                  <CaseCard key={practice.id} {...practice} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-ink-700 px-5 py-6 text-sm text-ink-400">
                {filter === "done"
                  ? "Aucun cas pratique terminé à ce niveau : vise 100/100 pour le valider."
                  : "Tous les cas pratiques de ce niveau sont terminés."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
