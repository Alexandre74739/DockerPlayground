/**
 * Types partagés décrivant le contenu pédagogique (modules, exercices, quiz).
 */

/** Option attendue dans une commande, avec ses alias (ex: ["-d", "--detach"]). */
export type FlagRule = {
  names: string[];
  /** Valeur attendue après l'option (ex: "8080:80"). Absent = option booléenne. */
  value?: string;
};

/** Décrit une commande valide pour une étape d'exercice. */
export type CommandRule = {
  /** Préfixes acceptés, ex: [["docker", "ps"], ["docker", "container", "ls"]]. */
  prefixes: string[][];
  /** Options obligatoires, dans n'importe quel ordre. */
  flags?: FlagRule[];
  /** Arguments positionnels obligatoires, dans l'ordre. */
  args?: string[];
};

export type CommandStep = {
  /** Consigne affichée à l'utilisateur. */
  instruction: string;
  rule: CommandRule;
  /** Une solution type, affichée sur demande. */
  solution: string;
  hint: string;
  /** Sortie simulée affichée dans le terminal en cas de succès. */
  output: string;
};

export type FileCheck = {
  pattern: RegExp;
  label: string;
};

type BaseExercise = {
  id: string;
  title: string;
  /** Contexte / explication de la notion, en quelques phrases. */
  intro: string;
};

export type CommandExercise = BaseExercise & {
  kind: "command";
  steps: CommandStep[];
};

export type FileExercise = BaseExercise & {
  kind: "file";
  fileName: string;
  instruction: string;
  starter: string;
  checks: FileCheck[];
  solution: string;
};

export type Exercise = CommandExercise | FileExercise;

export type QuizQuestion = {
  question: string;
  choices: string[];
  /** Index de la bonne réponse dans `choices`. */
  answer: number;
  explanation: string;
};

export type Module = {
  id: string;
  title: string;
  description: string;
  icon: string;
  exercises: Exercise[];
  quiz: QuizQuestion[];
};

export type CheatSheetSection = {
  title: string;
  commands: { command: string; description: string }[];
};
