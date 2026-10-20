import { matchCommand } from "./command-parser";
import type { ExecResult } from "./simulator";
import type { CommandStep } from "./types";

/**
 * Une étape est validée quand la commande correspond à la consigne ET
 * qu'elle a réussi dans le simulateur (code 0), ou échoué si c'est le but de l'étape.
 */
export function validatesStep(step: CommandStep, line: string, result: ExecResult): boolean {
  const succeeded = result.exitCode === 0;
  return (step.expect === "failure" ? !succeeded : succeeded) && matchCommand(line, step.rule).ok;
}
