/**
 * Types partagés décrivant le contenu pédagogique (modules, exercices, quiz).
 */
import type { SimulatorSetup } from "./simulator";

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
  /** "failure" : l'étape consiste à constater une erreur (code de sortie non nul). */
  expect?: "success" | "failure";
};

export type FileCheck = {
  pattern: RegExp;
  label: string;
  /** La vérification réussit si le motif est ABSENT (ex: pas de mot de passe en clair). */
  absent?: boolean;
};

type BaseExercise = {
  id: string;
  title: string;
  /** Contexte / explication de la notion, en quelques phrases. */
  intro: string;
};

export type CommandExercise = BaseExercise & {
  kind: "command";
  /** État initial de l'environnement simulé (conteneurs, images, fichiers…). */
  setup?: SimulatorSetup;
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

export type Language = "fr" | "en";

/** Vidéo YouTube (identifiants vérifiés). */
export type Video = {
  youtubeId: string;
  title: string;
  author: string;
  duration: string;
  lang: Language;
};

export type Resource = {
  title: string;
  url: string;
  kind: "doc" | "lab" | "article";
  lang: Language;
  description: string;
};

/** Nom d'une icône de la bibliothèque lucide (voir components/ui/ModuleIcon). */
export type ModuleIconName =
  | "rocket"
  | "layers"
  | "box"
  | "hammer"
  | "database"
  | "puzzle"
  | "cloud"
  | "brush"
  | "package"
  | "sliders"
  | "shield"
  | "users"
  | "git"
  | "bug";

/** Parcours : suite de modules autour d'un objectif. */
export type Track = {
  id: string;
  title: string;
  description: string;
  moduleIds: string[];
};

export type Module = {
  id: string;
  title: string;
  description: string;
  icon: ModuleIconName;
  /** Le cours écrit est dans lessons/<id>.md. */
  videos: Video[];
  resources: Resource[];
  exercises: Exercise[];
  quiz: QuizQuestion[];
};

export type CheatSheetSection = {
  title: string;
  commands: { command: string; description: string }[];
};
