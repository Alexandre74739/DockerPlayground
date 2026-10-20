import { describe, expect, it } from "vitest";
import { createEnvironment, execute, type ExecResult, type SimState } from "../simulator";
import { validatesStep } from "../step-validation";
import { modules } from ".";

/** Répond aux questions interactives comme le ferait l'utilisateur. */
function answer(state: SimState, result: ExecResult): ExecResult {
  let current = result;
  while (current.prompt) {
    const { prompt } = current;
    if (prompt.blocking) return { ...current, prompt: undefined, state: prompt.interrupt!(current.state).state };
    const reply = prompt.label.startsWith("Username")
      ? "alex"
      : prompt.label.startsWith("Password")
        ? "secret"
        : prompt.label.startsWith("?")
          ? ""
          : "y";
    current = prompt.respond(current.state, reply);
  }
  return current;
}

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
      const final = result.prompt && !result.prompt.blocking ? answer(state, result) : result;
      expect(validatesStep(step, step.solution, final), `${step.solution}\n${final.output}`).toBe(true);
      state = answer(state, final).state;
    }
  });
});
