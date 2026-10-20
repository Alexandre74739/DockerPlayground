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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/modules/${mod.id}`} className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-400 hover:text-neon-400">
          <ArrowLeft className="h-3.5 w-3.5" /> {mod.title}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Quiz</h1>
        <p className="mt-1 text-ink-400">{mod.title} — une seule réponse par question.</p>
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
