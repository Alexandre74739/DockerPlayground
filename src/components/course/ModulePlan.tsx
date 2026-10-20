"use client";

import { BookOpen, Check, ExternalLink, FileCode2, ListChecks, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { exerciseKey } from "@/lib/content";
import { useProgress } from "@/lib/progress";

type ModulePlanProps = {
  moduleId: string;
  outline: { id: string; title: string }[];
  exercises: { id: string; title: string; kind: "command" | "file" }[];
  quizCount: number;
};

/** Sommaire latéral d'un module : cours, pratique, quiz et ressources. */
export function ModulePlan({ moduleId, outline, exercises, quizCount }: ModulePlanProps) {
  const { completedExercises, lessonsRead, quizScores } = useProgress();
  const quizScore = quizScores[moduleId];
  const lessonRead = lessonsRead.includes(moduleId);

  return (
    <nav className="space-y-6 text-sm" aria-label="Plan du module">
      <div>
        <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-400">
          <BookOpen className="h-3.5 w-3.5" /> Cours {lessonRead && <Check className="h-3.5 w-3.5 text-neon-400" />}
        </p>
        <ul className="space-y-0.5 border-l border-ink-700">
          {outline.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="-ml-px block border-l border-transparent py-1 pl-3 text-ink-400 hover:border-neon-400 hover:text-ink-100"
              >
                {item.title}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#videos"
              className="-ml-px block border-l border-transparent py-1 pl-3 text-ink-400 hover:border-neon-400 hover:text-ink-100"
            >
              En vidéo
            </a>
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-400">
          <SquareTerminal className="h-3.5 w-3.5" /> Pratique
        </p>
        <ol className="space-y-1">
          {exercises.map((exercise, index) => {
            const done = completedExercises.includes(exerciseKey(moduleId, exercise.id));
            const Icon = exercise.kind === "command" ? SquareTerminal : FileCode2;
            return (
              <li key={exercise.id}>
                <Link
                  href={`/modules/${moduleId}/exercices/${exercise.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-ink-300 hover:bg-ink-800 hover:text-white"
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] ${done ? "bg-azure-500 text-white" : "border border-ink-600 text-ink-400"}`}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="flex-1 leading-snug">{exercise.title}</span>
                  <Icon className="h-3.5 w-3.5 text-ink-500" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <Link
        href={`/modules/${moduleId}/quiz`}
        className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 p-3 hover:border-neon-400/60"
      >
        <ListChecks className="h-5 w-5 text-neon-400" aria-hidden />
        <span className="flex-1">
          <span className="block font-medium text-ink-100">Quiz du module</span>
          <span className="font-mono text-xs text-ink-400">
            {quizCount} questions{quizScore !== undefined ? ` · meilleur : ${quizScore}%` : ""}
          </span>
        </span>
      </Link>

      <a
        href="#aller-plus-loin"
        className="flex items-center gap-2 px-1 font-mono text-xs uppercase tracking-wider text-ink-400 hover:text-ink-100"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Aller plus loin
      </a>
    </nav>
  );
}
