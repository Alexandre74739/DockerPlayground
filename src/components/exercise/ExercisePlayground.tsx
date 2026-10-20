"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <Link
            href={`/modules/${mod.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-100"
          >
            <ArrowLeft className="h-4 w-4" /> {mod.title}
          </Link>
          <p className="mt-6 text-sm font-medium text-neon-400">
            Exercice {index + 1} sur {mod.exercises.length}
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight text-ink-100">
            {exercise.title}
            {done && (
              <span className="inline-flex items-center gap-1 rounded-full border border-neon-400/30 px-2.5 py-0.5 text-xs font-medium text-neon-400">
                <Check className="h-3 w-3" strokeWidth={3} /> Réussi
              </span>
            )}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-400">
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
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]" aria-busy>
      <div className="h-72 animate-pulse rounded-xl bg-ink-850" />
      <div className="h-[min(600px,calc(100vh-21rem))] min-h-[380px] animate-pulse rounded-xl bg-ink-950" />
    </div>
  );
}
