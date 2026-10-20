"use client";

import { useSyncExternalStore } from "react";

/**
 * Progression stockée dans le localStorage du navigateur (aucune base de données).
 * Petit store externe compatible avec `useSyncExternalStore`.
 */
export type Progress = {
  completedExercises: string[];
  /** Meilleur score par module, en pourcentage. */
  quizScores: Record<string, number>;
};

const STORAGE_KEY = "docker-playground:progress";
const EMPTY: Progress = { completedExercises: [], quizScores: {} };

let cache: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Progress) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée…) : la progression reste en mémoire.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function markExerciseCompleted(key: string) {
  const current = read();
  if (current.completedExercises.includes(key)) return;
  write({ ...current, completedExercises: [...current.completedExercises, key] });
}

export function saveQuizScore(moduleId: string, percent: number) {
  const current = read();
  const best = Math.max(current.quizScores[moduleId] ?? 0, percent);
  write({ ...current, quizScores: { ...current.quizScores, [moduleId]: best } });
}

export function resetProgress() {
  write(EMPTY);
}
