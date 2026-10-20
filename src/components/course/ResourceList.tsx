import { ArrowUpRight, BookOpen, FlaskConical, Newspaper } from "lucide-react";
import type { Resource } from "@/lib/types";

const KINDS = {
  doc: { icon: BookOpen, label: "Documentation" },
  lab: { icon: FlaskConical, label: "Exercices en ligne" },
  article: { icon: Newspaper, label: "Ressource" },
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {resources.map((resource) => {
        const { icon: Icon, label } = KINDS[resource.kind];
        return (
          <li key={resource.url}>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full gap-3 rounded-xl border border-ink-700 bg-ink-850 p-4 transition hover:border-azure-400/60 hover:bg-ink-800"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${resource.kind === "lab" ? "bg-neon-950 text-neon-400" : "bg-azure-950 text-azure-400"}`}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium text-ink-100 group-hover:text-white">
                  {resource.title}
                  <ArrowUpRight className="h-3.5 w-3.5 text-ink-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-azure-400" />
                </span>
                <span className="mt-1 block text-sm leading-snug text-ink-400">{resource.description}</span>
                <span className="mt-2 block font-mono text-[11px] uppercase tracking-wider text-ink-500">
                  {label} · {resource.lang}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
