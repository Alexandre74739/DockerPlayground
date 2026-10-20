import type { Metadata } from "next";
import { CheatSheet } from "@/components/CheatSheet";
import { cheatSheet } from "@/lib/content/cheat-sheet";

export const metadata: Metadata = { title: "Aide-mémoire · Docker Playground" };

export default function CheatSheetPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-medium text-neon-400">Référence</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-100">Aide-mémoire</h1>
        <p className="mt-3 text-[17px] text-ink-400">Les commandes essentielles pour être autonome au quotidien.</p>
      </div>
      <CheatSheet sections={cheatSheet} />
    </div>
  );
}
