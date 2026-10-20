"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { CaseWorkspace } from "./CaseWorkspace";

/** Le simulateur ne tourne que dans le navigateur : rien n'est pré-rendu côté serveur. */
export function CaseLoader({ caseId }: { caseId: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="fixed inset-x-0 bottom-0 top-14 z-10 animate-pulse bg-ink-900" aria-busy />;
  return <CaseWorkspace caseId={caseId} />;
}
