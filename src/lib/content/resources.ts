import type { Language, Resource } from "../types";
import { featuredVideos, modules, tracks } from ".";

/**
 * Catalogue de toutes les ressources (vidéos et liens) des modules,
 * dédoublonnées et rattachées aux modules qui les citent.
 */

export type ResourceType = "video" | Resource["kind"];

export type ResourceEntry = {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  lang: Language;
  description?: string;
  author?: string;
  duration?: string;
  youtubeId?: string;
  /** Modules qui citent la ressource (vide pour les ressources générales). */
  modules: { id: string; title: string; trackId: string }[];
};

/** Incontournables, à garder sous la main au quotidien. */
export const essentials: Resource[] = [
  {
    title: "Documentation Docker",
    url: "https://docs.docker.com/",
    kind: "doc",
    lang: "en",
    description: "La référence officielle : guides, manuels et références.",
  },
  {
    title: "Référence de la CLI",
    url: "https://docs.docker.com/reference/",
    kind: "doc",
    lang: "en",
    description: "Chaque commande docker, chaque option, avec des exemples.",
  },
  {
    title: "Aide-mémoire officiel (PDF)",
    url: "https://docs.docker.com/get-started/docker_cheatsheet.pdf",
    kind: "article",
    lang: "en",
    description: "Les commandes essentielles sur une page, à imprimer.",
  },
  {
    title: "Guides par langage",
    url: "https://docs.docker.com/guides/",
    kind: "doc",
    lang: "en",
    description: "Dockeriser Node.js, Python, Java, Go, PHP… pas à pas.",
  },
  {
    title: "Play with Docker",
    url: "https://labs.play-with-docker.com/",
    kind: "lab",
    lang: "en",
    description: "Un vrai Docker dans le navigateur, gratuit, pour tester sans rien installer.",
  },
  {
    title: "Docker Hub",
    url: "https://hub.docker.com/",
    kind: "article",
    lang: "en",
    description: "Chercher une image officielle et lire sa documentation (variables, ports, tags).",
  },
  {
    title: "Atelier officiel « Getting started »",
    url: "https://docs.docker.com/get-started/workshop/",
    kind: "lab",
    lang: "en",
    description: "Un atelier complet, de la première image à Compose.",
  },
  {
    title: "Awesome Docker",
    url: "https://github.com/veggiemonk/awesome-docker",
    kind: "article",
    lang: "en",
    description: "Une liste communautaire d'outils, d'articles et de projets autour de Docker.",
  },
];

export function catalogResources(): ResourceEntry[] {
  const entries = new Map<string, ResourceEntry>();
  const trackOfModule = (moduleId: string) => tracks.find((track) => track.moduleIds.includes(moduleId))!.id;

  for (const video of featuredVideos) {
    entries.set(video.youtubeId, {
      id: video.youtubeId,
      type: "video",
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
      lang: video.lang,
      author: video.author,
      duration: video.duration,
      youtubeId: video.youtubeId,
      modules: [],
    });
  }
  for (const mod of modules) {
    const reference = { id: mod.id, title: mod.title, trackId: trackOfModule(mod.id) };
    for (const video of mod.videos) {
      const entry = entries.get(video.youtubeId) ?? {
        id: video.youtubeId,
        type: "video" as const,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
        lang: video.lang,
        author: video.author,
        duration: video.duration,
        youtubeId: video.youtubeId,
        modules: [],
      };
      entry.modules.push(reference);
      entries.set(video.youtubeId, entry);
    }
    for (const resource of mod.resources) {
      const key = resource.url.replace(/#.*$/, "");
      const entry = entries.get(key) ?? {
        id: key,
        type: resource.kind,
        title: resource.title,
        url: resource.url,
        lang: resource.lang,
        description: resource.description,
        modules: [],
      };
      entry.modules.push(reference);
      entries.set(key, entry);
    }
  }
  return [...entries.values()];
}
