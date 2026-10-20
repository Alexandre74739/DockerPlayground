import type { SimState } from "../simulator";
import { type CaseContext, HINT_PENALTY, type PracticeCase } from "./types";

export type CaseEvaluation = {
  results: { id: string; passed: boolean; points: number }[];
  earned: number;
  total: number;
  /** Score final sur 100, pénalités d'indices déduites. */
  score: number;
};

export function evaluate(practice: PracticeCase, state: SimState, initial: SimState, hintsUsed: number): CaseEvaluation {
  const context: CaseContext = { state, initial };
  const results = practice.objectives.map((objective) => {
    let passed = false;
    try {
      passed = objective.check(context);
    } catch {
      passed = false;
    }
    return { id: objective.id, passed, points: objective.points };
  });
  const total = results.reduce((sum, result) => sum + result.points, 0);
  const earned = results.filter((result) => result.passed).reduce((sum, result) => sum + result.points, 0);
  const score = Math.max(0, Math.round((earned / total) * 100) - hintsUsed * HINT_PENALTY);
  return { results, earned, total, score };
}
