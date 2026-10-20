import { describe, expect, it } from "vitest";
import { createEnvironment, execute, type ExecResult, type SimState } from "../simulator";
import { PROJECT_DIR } from "../simulator/state";
import { cases } from "./catalog";
import { evaluate } from "./scoring";

function answerPrompts(result: ExecResult): SimState {
  let current = result;
  while (current.prompt) {
    const { prompt } = current;
    if (prompt.blocking) return prompt.interrupt!(current.state).state;
    current = prompt.respond(
      current.state,
      prompt.label.startsWith("Username") ? "alex" : prompt.label.startsWith("Password") ? "secret" : "y",
    );
  }
  return current.state;
}

describe.each(cases)("cas pratique $id", (practice) => {
  it("totalise 100 points", () => {
    expect(practice.objectives.reduce((sum, objective) => sum + objective.points, 0)).toBe(100);
  });

  it("n'est pas réussi au départ", () => {
    const initial = createEnvironment(practice.setup);
    expect(evaluate(practice, initial, initial, 0).score).toBeLessThan(50);
  });

  it("la solution de référence obtient 100/100", () => {
    const initial = createEnvironment(practice.setup);
    let state = structuredClone(initial);
    for (const [path, content] of Object.entries(practice.solution.files ?? {})) state.files[`${PROJECT_DIR}/${path}`] = content;
    for (const command of practice.solution.commands) state = answerPrompts(execute(state, command));
    const evaluation = evaluate(practice, state, initial, 0);
    const failing = practice.objectives
      .filter((objective) => !evaluation.results.find((result) => result.id === objective.id)!.passed)
      .map((objective) => objective.label);
    expect(failing).toEqual([]);
    expect(evaluation.score).toBe(100);
  });
});
