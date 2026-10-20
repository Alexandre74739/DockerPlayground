import type { Exercise, Module, Track, Video } from "../types";
import { composeModule } from "./compose";
import { composeEquipe } from "./compose-equipe";
import { configuration } from "./configuration";
import { conteneurs } from "./conteneurs";
import { debug } from "./debug";
import { dockerHub } from "./docker-hub";
import { dockerfile } from "./dockerfile";
import { dockeriser } from "./dockeriser";
import { hubEquipe } from "./hub-equipe";
import { images } from "./images";
import { maintenance } from "./maintenance";
import { premiersPas } from "./premiers-pas";
import { securite } from "./securite";
import { volumesReseaux } from "./volumes-reseaux";

/** Modules dans l'ordre conseillé de progression. */
export const modules: Module[] = [
  premiersPas,
  images,
  conteneurs,
  dockerfile,
  volumesReseaux,
  composeModule,
  dockerHub,
  maintenance,
  dockeriser,
  configuration,
  securite,
  composeEquipe,
  hubEquipe,
  debug,
];

/** Parcours : regroupements de modules, à suivre dans l'ordre. */
export const tracks: Track[] = [
  {
    id: "fondamentaux",
    title: "Fondamentaux",
    description: "Images, conteneurs, Dockerfile, volumes, Compose et Docker Hub : tout ce qu'il faut pour être autonome.",
    moduleIds: ["premiers-pas", "images", "conteneurs", "dockerfile", "volumes-reseaux", "compose", "docker-hub", "maintenance"],
  },
  {
    id: "dockeriser",
    title: "Dockeriser ses applications",
    description: "Conteneuriser un vrai projet, gérer sa configuration et produire des images sûres et légères.",
    moduleIds: ["dockeriser", "configuration", "securite"],
  },
  {
    id: "equipe",
    title: "Travailler en équipe",
    description: "Compose multi-environnements, publication en organisation, CI/CD et dépannage.",
    moduleIds: ["compose-equipe", "hub-equipe", "debug"],
  },
];

export function trackOf(moduleId: string): Track | undefined {
  return tracks.find((track) => track.moduleIds.includes(moduleId));
}

export function getModule(moduleId: string): Module | undefined {
  return modules.find((mod) => mod.id === moduleId);
}

export function getExercise(mod: Module, exerciseId: string): Exercise | undefined {
  return mod.exercises.find((exercise) => exercise.id === exerciseId);
}

/** Identifiant global unique d'un exercice, utilisé pour la progression. */
export function exerciseKey(moduleId: string, exerciseId: string): string {
  return `${moduleId}/${exerciseId}`;
}

export const totalExercises = modules.reduce((sum, mod) => sum + mod.exercises.length, 0);

/** Cours complets en vidéo, mis en avant sur l'accueil. */
export const featuredVideos: Video[] = [
  {
    youtubeId: "sn6PlRf-UHk",
    title: "Tutoriel Docker pour débutants [cours complet en 1 heure]",
    author: "SFYNX Tutoriel Français",
    duration: "54:53",
    lang: "fr",
  },
  {
    youtubeId: "3c-iBn73dDE",
    title: "Docker Tutorial for Beginners [full course in 3 hours]",
    author: "TechWorld with Nana",
    duration: "2:46:15",
    lang: "en",
  },
  {
    youtubeId: "fqMOX6JJhGo",
    title: "Docker Tutorial for Beginners — A Full DevOps Course",
    author: "freeCodeCamp.org",
    duration: "2:10:18",
    lang: "en",
  },
];
