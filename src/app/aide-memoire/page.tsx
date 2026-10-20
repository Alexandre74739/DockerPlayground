import type { Metadata } from "next";
import { cheatSheet } from "@/lib/content/cheat-sheet";

export const metadata: Metadata = { title: "Aide-mémoire · Docker Playground" };

export default function CheatSheetPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Aide-mémoire</h1>
        <p className="mt-2 text-brand-900/80">Les commandes essentielles pour être autonome au quotidien.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {cheatSheet.map((section) => (
          <section key={section.title} className="rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="mb-4 font-semibold text-brand-800">{section.title}</h2>
            <dl className="space-y-3">
              {section.commands.map((item) => (
                <div key={item.command}>
                  <dt>
                    <code className="font-mono text-sm text-brand-700">{item.command}</code>
                  </dt>
                  <dd className="text-sm text-brand-900/70">{item.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
