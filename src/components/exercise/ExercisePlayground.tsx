"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, FileCode2, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { exerciseKey, getExercise, getModule } from "@/lib/content";
import { markExerciseCompleted, useProgress } from "@/lib/progress";
import { useHydrated } from "@/lib/use-hydrated";
import { RichText } from "../RichText";
import { ButtonLink } from "../ui/Button";
import { CommandPlayground } from "./CommandPlayground";
import { FilePlayground } from "./FilePlayground";

type ExercisePlaygroundProps = {
  moduleId: string;
  exerciseId: string;
};

/**
 * Point d'entrée client d'un exercice. Le contenu est chargé ici (et non passé
 * depuis le serveur) car les vérifications de fichiers utilisent des RegExp,
 * non sérialisables entre composants serveur et client.
 */
export function ExercisePlayground({ moduleId, exerciseId }: ExercisePlaygroundProps) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const mod = getModule(moduleId);
  const exercise = mod && getExercise(mod, exerciseId);
  if (!mod || !exercise) return null;

  const key = exerciseKey(mod.id, exercise.id);
  const done = progress.completedExercises.includes(key);
  const index = mod.exercises.indexOf(exercise);
  const next = mod.exercises[index + 1];
  const nextHref = next ? `/modules/${mod.id}/exercices/${next.id}` : `/modules/${mod.id}/quiz`;
  const nextLabel = next ? "Exercice suivant" : "Passer au quiz";

  const onComplete = () => markExerciseCompleted(key);
  const KindIcon = exercise.kind === "command" ? SquareTerminal : FileCode2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <nav className="mb-3 flex items-center gap-2 font-mono text-xs text-ink-400">
            <Link href={`/modules/${mod.id}`} className="inline-flex items-center gap-1.5 hover:text-neon-400">
              <ArrowLeft className="h-3.5 w-3.5" /> {mod.title}
            </Link>
            <span className="text-ink-600">/</span>
            <span>
              exercice {index + 1}/{mod.exercises.length}
            </span>
          </nav>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <KindIcon className="h-7 w-7 text-azure-400" aria-hidden />
            {exercise.title}
            {done && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neon-950 px-2.5 py-0.5 text-xs font-medium text-neon-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Réussi
              </span>
            )}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-300">
            <RichText text={exercise.intro} />
          </p>
        </div>
        {done && (
          <ButtonLink href={nextHref} variant="primary">
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        )}
      </div>

      {!hydrated ? (
        <WorkspaceSkeleton />
      ) : exercise.kind === "command" ? (
        <CommandPlayground key={key} exercise={exercise} onComplete={onComplete} />
      ) : (
        <FilePlayground key={key} exercise={exercise} onComplete={onComplete} />
      )}
    </div>
  );
}

/** Emplacement réservé pendant le chargement : le simulateur ne tourne que dans le navigateur. */
function WorkspaceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]" aria-busy>
      <div className="h-72 animate-pulse rounded-xl border border-ink-700 bg-ink-850" />
      <div className="h-[min(640px,calc(100vh-10rem))] min-h-[420px] animate-pulse rounded-xl border border-ink-700 bg-ink-950" />
    </div>
  );
}
