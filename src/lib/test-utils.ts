import type { ExecResult } from "./simulator";

/** Mot de passe des serveurs (VPS) utilisés par les exercices et cas pratiques. */
export const VPS_PASSWORD = "Vps!2024";

/** Réponse type à une question interactive du terminal, pour rejouer les solutions. */
export function autoAnswer(label: string): string {
  if (/^Username/.test(label)) return "alex";
  if (/^Password/.test(label)) return "secret";
  if (/password for|'s password/.test(label)) return VPS_PASSWORD;
  if (/continue connecting/.test(label)) return "yes";
  if (/^(\?|Enter )/.test(label)) return "";
  return "y";
}

/** Répond à toutes les questions ; un processus au premier plan est interrompu (Ctrl+C). */
export function answerAll(result: ExecResult): ExecResult {
  let current = result;
  while (current.prompt) {
    const { prompt } = current;
    if (prompt.blocking) return { ...prompt.interrupt!(current.state), output: current.output };
    current = prompt.respond(current.state, autoAnswer(prompt.label));
  }
  return current;
}
