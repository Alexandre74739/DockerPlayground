import type { SimState, SimulatorSetup } from "../simulator";

/** Ce que voit une vérification : l'état actuel et l'état de départ du cas pratique. */
export type CaseContext = { state: SimState; initial: SimState };

export type CaseObjective = {
  id: string;
  /** Critère d'acceptation, formulé comme dans un ticket. */
  label: string;
  points: number;
  hint: string;
  check: (context: CaseContext) => boolean;
};

export type CaseLevel = "Débutant" | "Intermédiaire" | "Avancé";

export type PracticeCase = {
  id: string;
  title: string;
  level: CaseLevel;
  /** Durée indicative, ex: "15 min". */
  duration: string;
  skills: string[];
  /** Modules à avoir suivis avant. */
  moduleIds: string[];
  /** Résumé d'une phrase, affiché dans la liste des cas pratiques. */
  summary: string;
  /** Le ticket : contexte métier et demande, en Markdown simple (paragraphes, listes, `code`). */
  brief: string;
  setup: SimulatorSetup;
  objectives: CaseObjective[];
  /** Solution de référence (fichiers à écrire puis commandes), vérifiée par les tests. */
  solution: { files?: Record<string, string>; commands: string[] };
};

/** Points retirés pour chaque indice consulté. */
export const HINT_PENALTY = 5;
