import { describe, expect, it } from "vitest";
import { createEnvironment, execute } from "../simulator";
import { answerAll } from "../test-utils";
import { validatesStep } from "../step-validation";
import { modules } from ".";

/**
 * Joue toutes les solutions de chaque exercice terminal dans le simulateur :
 * chaque étape doit être validée, dans l'ordre, sans erreur.
 */
describe.each(
  modules.flatMap((mod) =>
    mod.exercises.filter((exercise) => exercise.kind === "command").map((exercise) => ({ id: `${mod.id}/${exercise.id}`, exercise })),
  ),
)("scénario $id", ({ exercise }) => {
  it("les solutions valident toutes les étapes", () => {
    if (exercise.kind !== "command") return;
    let state = createEnvironment(exercise.setup);
    for (const step of exercise.steps) {
      if (state.shell && !["sh", "bash"].includes(step.solution)) state = execute(state, "exit").state;
      const result = execute(state, step.solution);
      const final = result.prompt && !result.prompt.blocking ? answerAll(result) : result;
      expect(validatesStep(step, step.solution, final), `${step.solution}\n${final.output}`).toBe(true);
      state = answerAll(final).state;
    }
  });
});
