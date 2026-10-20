import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseList } from "@/components/ExerciseList";
import { getModule, modules } from "@/lib/content";

export function generateStaticParams() {
  return modules.map((mod) => ({ moduleId: mod.id }));
}

export async function generateMetadata({ params }: PageProps<"/modules/[moduleId]">) {
  const { moduleId } = await params;
  return { title: `${getModule(moduleId)?.title ?? "Module"} · Docker Playground` };
}

export default async function ModulePage({ params }: PageProps<"/modules/[moduleId]">) {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  const index = modules.indexOf(mod);
  const previous = modules[index - 1];
  const next = modules[index + 1];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          ← Parcours
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-3xl">{mod.icon}</span>
          <div>
            <p className="text-sm text-brand-500">Module {index + 1}</p>
            <h1 className="text-2xl font-bold text-brand-950">{mod.title}</h1>
          </div>
        </div>
        <p className="mt-4 text-brand-900/80">{mod.description}</p>
      </div>

      <ExerciseList
        moduleId={mod.id}
        exercises={mod.exercises.map(({ id, title, kind }) => ({ id, title, kind }))}
        quizCount={mod.quiz.length}
      />

      <div className="flex justify-between border-t border-brand-100 pt-6 text-sm">
        {previous ? (
          <Link href={`/modules/${previous.id}`} className="text-brand-600 hover:underline">
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/modules/${next.id}`} className="text-brand-600 hover:underline">
            {next.title} →
          </Link>
        )}
      </div>
    </div>
  );
}
