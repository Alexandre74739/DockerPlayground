"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ResourceEntry, ResourceType } from "@/lib/content/resources";
import type { Language } from "@/lib/types";

type Group = { id: string; title: string; trackTitle: string };

type ResourceBrowserProps = {
  resources: ResourceEntry[];
  /** Modules dans l'ordre des parcours. */
  groups: Group[];
};

const TYPES: { id: ResourceType | "all"; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "video", label: "Vidéos" },
  { id: "doc", label: "Documentation" },
  { id: "lab", label: "Exercices en ligne" },
  { id: "article", label: "Articles et outils" },
];

const TYPE_LABELS: Record<ResourceType, string> = { video: "Vidéo", doc: "Documentation", lab: "Exercices en ligne", article: "Article" };

type SegmentedProps<T extends string> = { value: T; options: { id: T; label: string }[]; onChange: (value: T) => void; label: string };

function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-ink-800 bg-ink-850 p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${value === option.id ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ResourceRow({ resource }: { resource: ResourceEntry }) {
  return (
    <li>
      <a href={resource.url} target="_blank" rel="noreferrer" className="group flex items-start gap-4 py-3.5">
        {resource.youtubeId && (
          <span className="relative hidden w-32 shrink-0 overflow-hidden rounded-md border border-ink-800 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature externe */}
            <img
              src={`https://i.ytimg.com/vi/${resource.youtubeId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              className="aspect-video w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
            <span className="absolute bottom-1 right-1 rounded bg-ink-950/85 px-1 font-mono text-[10px] text-ink-200">
              {resource.duration}
            </span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink-100 group-hover:underline group-hover:decoration-ink-500 group-hover:underline-offset-[3px]">
            {resource.title}
          </span>
          {resource.description && <span className="mt-0.5 block text-sm text-ink-400">{resource.description}</span>}
          <span className="mt-1.5 flex flex-wrap gap-x-2 text-xs text-ink-500">
            <span>{TYPE_LABELS[resource.type]}</span>
            <span>·</span>
            <span className={resource.lang === "fr" ? "text-neon-400" : ""}>{resource.lang === "fr" ? "Français" : "Anglais"}</span>
            {resource.author && (
              <>
                <span>·</span>
                <span>{resource.author}</span>
              </>
            )}
            {resource.modules.length > 1 && (
              <>
                <span>·</span>
                <span>
                  aussi dans :{" "}
                  {resource.modules
                    .slice(1)
                    .map((mod) => mod.title)
                    .join(", ")}
                </span>
              </>
            )}
          </span>
        </span>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neon-400" />
      </a>
    </li>
  );
}

/** Liste filtrable des ressources : recherche, type, langue ; regroupées par module. */
export function ResourceBrowser({ resources, groups }: ResourceBrowserProps) {
  const [type, setType] = useState<ResourceType | "all">("all");
  const [lang, setLang] = useState<Language | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const haystack = `${resource.title} ${resource.description ?? ""} ${resource.author ?? ""} ${resource.modules.map((mod) => mod.title).join(" ")}`;
      return (
        (type === "all" || resource.type === type) &&
        (lang === "all" || resource.lang === lang) &&
        (!needle || haystack.toLowerCase().includes(needle))
      );
    });
  }, [resources, type, lang, query]);

  const general = filtered.filter((resource) => resource.modules.length === 0);
  const sections = groups
    .map((group) => ({ ...group, items: filtered.filter((resource) => resource.modules[0]?.id === group.id) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-850 px-3.5 focus-within:border-ink-500">
          <Search className="h-4 w-4 text-ink-500" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher (ex : volumes, ssh, cache, sécurité)…"
            className="flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
          />
        </label>
        <Segmented value={type} options={TYPES} onChange={setType} label="Type de ressource" />
        <Segmented
          value={lang}
          options={[
            { id: "all", label: "FR + EN" },
            { id: "fr", label: "Français" },
            { id: "en", label: "Anglais" },
          ]}
          onChange={setLang}
          label="Langue"
        />
      </div>

      <p className="text-sm text-ink-500">
        {filtered.length} ressource{filtered.length > 1 ? "s" : ""}
      </p>

      {general.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink-100">Cours complets</h2>
          <p className="mt-1 text-sm text-ink-400">Pour tout revoir d&apos;une traite.</p>
          <ul className="mt-2 divide-y divide-ink-800 border-y border-ink-800">
            {general.map((resource) => (
              <ResourceRow key={resource.id} resource={resource} />
            ))}
          </ul>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id}>
          <p className="text-xs font-medium text-ink-500">{section.trackTitle}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-100">{section.title}</h2>
          <ul className="mt-2 divide-y divide-ink-800 border-y border-ink-800">
            {section.items.map((resource) => (
              <ResourceRow key={resource.id} resource={resource} />
            ))}
          </ul>
        </section>
      ))}

      {filtered.length === 0 && <p className="py-10 text-center text-ink-400">Aucune ressource ne correspond à ces filtres.</p>}
    </div>
  );
}
