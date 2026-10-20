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
        <Link href={`/modules/${mod.id}`} className="text-sm text-brand-600 hover:underline">
          ← {mod.icon} {mod.title}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-brand-950">Quiz : {mod.title}</h1>
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
