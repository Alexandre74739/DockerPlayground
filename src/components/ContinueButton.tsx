"use client";

import { ArrowRight } from "lucide-react";
import { exerciseKey, modules } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { ButtonLink } from "./ui/Button";

/** Renvoie vers la prochaine étape non faite : cours, exercice ou quiz. */
export function ContinueButton() {
  const { completedExercises, lessonsRead, quizScores } = useProgress();
  const started = completedExercises.length > 0 || lessonsRead.length > 0;

  let href = `/modules/${modules[0].id}`;
  for (const mod of modules) {
    if (!lessonsRead.includes(mod.id)) {
      href = `/modules/${mod.id}`;
      break;
    }
    const exercise = mod.exercises.find((candidate) => !completedExercises.includes(exerciseKey(mod.id, candidate.id)));
    if (exercise) {
      href = `/modules/${mod.id}/exercices/${exercise.id}`;
      break;
    }
    if (quizScores[mod.id] === undefined) {
      href = `/modules/${mod.id}/quiz`;
      break;
    }
  }

  return (
    <ButtonLink href={href} variant="primary">
      {started ? "Reprendre" : "Commencer le parcours"} <ArrowRight className="h-4 w-4" />
    </ButtonLink>
  );
}
