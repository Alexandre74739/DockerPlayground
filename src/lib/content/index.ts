import type { Exercise, Module } from "../types";
import { composeModule } from "./compose";
import { conteneurs } from "./conteneurs";
import { dockerHub } from "./docker-hub";
import { dockerfile } from "./dockerfile";
import { images } from "./images";
import { maintenance } from "./maintenance";
import { premiersPas } from "./premiers-pas";
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
];

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
