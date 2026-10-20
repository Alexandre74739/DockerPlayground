import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { ResourceBrowser } from "@/components/resources/ResourceBrowser";
import { getModule, tracks } from "@/lib/content";
import { catalogResources, essentials } from "@/lib/content/resources";

export const metadata: Metadata = { title: "Ressources · Docker Playground" };

export default function ResourcesPage() {
  const resources = catalogResources();
  const groups = tracks.flatMap((track) => track.moduleIds.map((id) => ({ id, title: getModule(id)!.title, trackTitle: track.title })));
  const videoCount = resources.filter((resource) => resource.type === "video").length;

  return (
    <div className="space-y-14">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-neon-400">Bibliothèque</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-100">Ressources</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-400">
          {videoCount} vidéos et {resources.length - videoCount} liens de documentation et d&apos;exercices, vérifiés et classés par module.
          Les ressources en français sont signalées en vert.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink-100">Les incontournables</h2>
        <p className="mt-1 text-sm text-ink-400">À garder dans ses favoris.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {essentials.map((resource) => (
            <li key={resource.url}>
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col rounded-xl border border-ink-800 bg-ink-850 p-4 transition-colors hover:border-ink-600"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink-100">{resource.title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-500 transition group-hover:text-neon-400" />
                </span>
                <span className="mt-1.5 text-sm leading-snug text-ink-400">{resource.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <ResourceBrowser resources={resources} groups={groups} />
    </div>
  );
}
