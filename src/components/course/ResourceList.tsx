import { ArrowUpRight } from "lucide-react";
import type { Resource } from "@/lib/types";

const KIND_LABELS: Record<Resource["kind"], string> = {
  doc: "Documentation",
  lab: "Exercices en ligne",
  article: "Ressource",
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="divide-y divide-ink-800 border-y border-ink-800">
      {resources.map((resource) => (
        <li key={resource.url}>
          <a href={resource.url} target="_blank" rel="noreferrer" className="group flex items-start gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink-100">{resource.title}</p>
              <p className="mt-0.5 text-sm text-ink-400">{resource.description}</p>
            </div>
            <span className="hidden shrink-0 pt-0.5 text-xs text-ink-500 sm:block">
              {KIND_LABELS[resource.kind]} · {resource.lang.toUpperCase()}
            </span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neon-400" />
          </a>
        </li>
      ))}
    </ul>
  );
}
