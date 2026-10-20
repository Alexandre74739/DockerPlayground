"use client";

import { useSyncExternalStore } from "react";

/**
 * Progression stockée dans le localStorage du navigateur (aucune base de données).
 * Petit store externe compatible avec `useSyncExternalStore`.
 */
export type Progress = {
  completedExercises: string[];
  /** Modules dont le cours a été marqué comme lu. */
  lessonsRead: string[];
  /** Meilleur score par module, en pourcentage. */
  quizScores: Record<string, number>;
  /** Meilleur résultat par cas pratique. */
  caseResults: Record<string, CaseResult>;
};

export type CaseResult = { bestScore: number; bestTimeMs: number; deliveries: number; lastDeliveredAt: number };

const STORAGE_KEY = "docker-playground:progress";
const EMPTY: Progress = { completedExercises: [], lessonsRead: [], quizScores: {}, caseResults: {} };

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

export function markLessonRead(moduleId: string) {
  const current = read();
  if (current.lessonsRead.includes(moduleId)) return;
  write({ ...current, lessonsRead: [...current.lessonsRead, moduleId] });
}

export function saveQuizScore(moduleId: string, percent: number) {
  const current = read();
  const best = Math.max(current.quizScores[moduleId] ?? 0, percent);
  write({ ...current, quizScores: { ...current.quizScores, [moduleId]: best } });
}

/** Enregistre une livraison de cas pratique et conserve le meilleur score (puis le meilleur temps). */
export function saveCaseResult(caseId: string, score: number, timeMs: number) {
  const current = read();
  const previous = current.caseResults[caseId];
  const better = !previous || score > previous.bestScore || (score === previous.bestScore && timeMs < previous.bestTimeMs);
  const result: CaseResult = {
    bestScore: better ? score : previous.bestScore,
    bestTimeMs: better ? timeMs : previous.bestTimeMs,
    deliveries: (previous?.deliveries ?? 0) + 1,
    lastDeliveredAt: Date.now(),
  };
  write({ ...current, caseResults: { ...current.caseResults, [caseId]: result } });
}

export function resetProgress() {
  write(EMPTY);
}
