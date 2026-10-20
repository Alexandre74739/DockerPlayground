import { describe, expect, it } from "vitest";
import { matchCommand } from "../command-parser";
import { modules } from ".";

/** Garantit la cohérence du contenu : chaque solution doit valider son exercice. */
describe.each(modules)("module $id", (mod) => {
  it("a des identifiants d'exercices uniques", () => {
    const ids = mod.exercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a des réponses de quiz valides", () => {
    for (const question of mod.quiz) {
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.choices.length);
    }
  });

  for (const exercise of mod.exercises) {
    if (exercise.kind === "command") {
      it.each(exercise.steps.map((step) => [step.solution, step]))(`${exercise.id} : « %s » est acceptée`, (_, step) => {
        expect(matchCommand(step.solution, step.rule)).toEqual({ ok: true });
      });
    } else {
      it(`${exercise.id} : la solution passe toutes les vérifications`, () => {
        const failing = exercise.checks.filter((check) => !check.pattern.test(exercise.solution));
        expect(failing.map((check) => check.label)).toEqual([]);
      });

      it(`${exercise.id} : le fichier de départ ne passe pas toutes les vérifications`, () => {
        expect(exercise.checks.every((check) => check.pattern.test(exercise.starter))).toBe(false);
      });
    }
  }
});
