"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import type { CheatSheetSection } from "@/lib/types";
import { CopyButton } from "./ui/CopyButton";

export function CheatSheet({ sections }: { sections: CheatSheetSection[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = sections
    .map((section) => ({
      ...section,
      commands: section.commands.filter((item) => !needle || `${item.command} ${item.description}`.toLowerCase().includes(needle)),
    }))
    .filter((section) => section.commands.length > 0);

  return (
    <div className="space-y-10">
      <label className="flex h-10 max-w-md items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-850 px-3.5 focus-within:border-ink-500">
        <Search className="h-4 w-4 text-ink-500" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une commande (ex : volume, logs, push)…"
          className="flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
        />
      </label>
      <div className="columns-1 gap-12 lg:columns-2">
        {filtered.map((section) => (
          <section key={section.title} className="mb-10 break-inside-avoid">
            <h2 className="mb-3 font-medium text-ink-100">{section.title}</h2>
            <dl className="divide-y divide-ink-800 border-y border-ink-800">
              {section.commands.map((item) => (
                <div key={item.command} className="group py-2.5">
                  <dt className="flex items-center gap-2">
                    <code className="font-mono text-[13px] text-ink-100">{item.command}</code>
                    <CopyButton text={item.command} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
                  </dt>
                  <dd className="mt-0.5 text-sm text-ink-500">{item.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {filtered.length === 0 && <p className="text-ink-400">Aucune commande ne correspond à « {query} ».</p>}
      </div>
    </div>
  );
}
