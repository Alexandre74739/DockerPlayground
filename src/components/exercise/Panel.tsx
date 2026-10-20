import type { ReactNode } from "react";

/** Bloc du panneau latéral des exercices. */
export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-800 bg-ink-850">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-medium text-ink-100">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
