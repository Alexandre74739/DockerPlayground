import { matchCommand } from "./command-parser";
import type { ExecResult } from "./simulator";
import type { CommandStep } from "./types";

/**
 * Une étape est validée quand la commande correspond à la consigne ET
 * qu'elle a réussi dans le simulateur (code de sortie 0).
 */
export function validatesStep(step: CommandStep, line: string, result: ExecResult): boolean {
  return result.exitCode === 0 && matchCommand(line, step.rule).ok;
}
