"use client";

import { Check, Copy, Search } from "lucide-react";
import { useState } from "react";
import type { CheatSheetSection } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // Presse-papiers indisponible : rien à faire.
        }
      }}
      className="shrink-0 rounded p-1 text-ink-500 opacity-0 transition group-hover:opacity-100 hover:text-ink-100 focus:opacity-100"
      aria-label={`Copier ${text}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-neon-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

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
    <div className="space-y-6">
      <label className="flex max-w-md items-center gap-2.5 rounded-xl border border-ink-700 bg-ink-850 px-4 py-2.5 focus-within:border-azure-400">
        <Search className="h-4 w-4 text-ink-500" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une commande (ex : volume, logs, push)…"
          className="flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
        />
      </label>
      <div className="columns-1 gap-5 lg:columns-2">
        {filtered.map((section) => (
          <section key={section.title} className="mb-5 break-inside-avoid rounded-2xl border border-ink-700 bg-ink-850 p-5">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-neon-400">{section.title}</h2>
            <dl className="space-y-3">
              {section.commands.map((item) => (
                <div key={item.command} className="group">
                  <dt className="flex items-center gap-2">
                    <code className="font-mono text-sm text-azure-300">{item.command}</code>
                    <CopyButton text={item.command} />
                  </dt>
                  <dd className="text-sm text-ink-400">{item.description}</dd>
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
