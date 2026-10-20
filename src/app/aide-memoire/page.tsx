import type { Metadata } from "next";
import { CheatSheet } from "@/components/CheatSheet";
import { cheatSheet } from "@/lib/content/cheat-sheet";

export const metadata: Metadata = { title: "Aide-mémoire · Docker Playground" };

export default function CheatSheetPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">Référence</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Aide-mémoire</h1>
        <p className="mt-2 text-ink-400">Les commandes essentielles pour être autonome au quotidien.</p>
      </div>
      <CheatSheet sections={cheatSheet} />
    </div>
  );
}
