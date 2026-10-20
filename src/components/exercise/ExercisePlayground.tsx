"use client";

import Link from "next/link";
import { exerciseKey, getExercise, getModule } from "@/lib/content";
import { markExerciseCompleted, useProgress } from "@/lib/progress";
import { RichText } from "../RichText";
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
  const mod = getModule(moduleId);
  const exercise = mod && getExercise(mod, exerciseId);
  if (!mod || !exercise) return null;

  const key = exerciseKey(mod.id, exercise.id);
  const alreadyDone = progress.completedExercises.includes(key);
  const index = mod.exercises.indexOf(exercise);
  const next = mod.exercises[index + 1];
  const nextHref = next ? `/modules/${mod.id}/exercices/${next.id}` : `/modules/${mod.id}/quiz`;
  const nextLabel = next ? `Exercice suivant : ${next.title}` : "Passer au quiz du module";

  const onComplete = () => markExerciseCompleted(key);

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-2 text-sm text-brand-600">
          <Link href={`/modules/${mod.id}`} className="hover:underline">
            {mod.icon} {mod.title}
          </Link>
          <span className="mx-2 text-brand-300">/</span>
          <span className="text-brand-800">
            Exercice {index + 1} sur {mod.exercises.length}
          </span>
        </nav>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-brand-950">
          {exercise.title}
          {alreadyDone && (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">Réussi ✓</span>
          )}
        </h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-brand-900/80">
          <RichText text={exercise.intro} />
        </p>
      </div>

      {exercise.kind === "command" ? (
        <CommandPlayground key={key} exercise={exercise} onComplete={onComplete} />
      ) : (
        <FilePlayground key={key} exercise={exercise} onComplete={onComplete} />
      )}

      {alreadyDone && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="font-medium text-brand-900">🎉 Exercice validé !</p>
          <Link
            href={nextHref}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {nextLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
