import { notFound } from "next/navigation";
import { ExercisePlayground } from "@/components/exercise/ExercisePlayground";
import { getExercise, getModule, modules } from "@/lib/content";

export function generateStaticParams() {
  return modules.flatMap((mod) =>
    mod.exercises.map((exercise) => ({ moduleId: mod.id, exerciseId: exercise.id })),
  );
}

export async function generateMetadata({ params }: PageProps<"/modules/[moduleId]/exercices/[exerciseId]">) {
  const { moduleId, exerciseId } = await params;
  const mod = getModule(moduleId);
  const exercise = mod && getExercise(mod, exerciseId);
  return { title: `${exercise?.title ?? "Exercice"} · Docker Playground` };
}

export default async function ExercisePage({ params }: PageProps<"/modules/[moduleId]/exercices/[exerciseId]">) {
  const { moduleId, exerciseId } = await params;
  const mod = getModule(moduleId);
  if (!mod || !getExercise(mod, exerciseId)) notFound();

  return <ExercisePlayground moduleId={moduleId} exerciseId={exerciseId} />;
}
