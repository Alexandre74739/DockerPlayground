import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { getModule, modules } from "@/lib/content";

export function generateStaticParams() {
  return modules.map((mod) => ({ moduleId: mod.id }));
}

export async function generateMetadata({ params }: PageProps<"/modules/[moduleId]/quiz">) {
  const { moduleId } = await params;
  return { title: `Quiz ${getModule(moduleId)?.title ?? ""} · Docker Playground` };
}

export default async function QuizPage({ params }: PageProps<"/modules/[moduleId]/quiz">) {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  const next = modules[modules.indexOf(mod) + 1];

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <Link
          href={`/modules/${mod.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="h-4 w-4" /> {mod.title}
        </Link>
        <p className="mt-8 text-sm font-medium text-neon-400">Quiz</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-100">{mod.title}</h1>
      </div>
      <Quiz
        moduleId={mod.id}
        questions={mod.quiz}
        nextHref={next ? `/modules/${next.id}` : "/"}
        nextLabel={next ? `Module suivant : ${next.title}` : "Retour au parcours"}
      />
    </div>
  );
}
