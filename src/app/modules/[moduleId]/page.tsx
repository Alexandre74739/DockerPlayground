import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonDone } from "@/components/course/LessonDone";
import { Markdown } from "@/components/course/Markdown";
import { ModulePlan } from "@/components/course/ModulePlan";
import { ResourceList } from "@/components/course/ResourceList";
import { VideoCard } from "@/components/course/VideoCard";
import { getModule, modules } from "@/lib/content";
import { getLesson, lessonOutline, readingMinutes } from "@/lib/content/lessons";

export function generateStaticParams() {
  return modules.map((mod) => ({ moduleId: mod.id }));
}

export async function generateMetadata({ params }: PageProps<"/modules/[moduleId]">) {
  const { moduleId } = await params;
  return { title: `${getModule(moduleId)?.title ?? "Module"} · Docker Playground` };
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-6 scroll-mt-24 text-[1.35rem] font-semibold tracking-tight text-ink-100">
      {children}
    </h2>
  );
}

export default async function ModulePage({ params }: PageProps<"/modules/[moduleId]">) {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  const lesson = getLesson(mod.id);
  const index = modules.indexOf(mod);
  const previous = modules[index - 1];
  const next = modules[index + 1];
  const meta = [
    `${readingMinutes(lesson)} min de lecture`,
    `${mod.videos.length} vidéos`,
    `${mod.exercises.length} exercices`,
    `${mod.quiz.length} questions`,
  ];

  return (
    <div>
      <header className="mb-12 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" /> Parcours
        </Link>
        <p className="mt-8 text-sm font-medium text-neon-400">Module {index + 1}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-100">{mod.title}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-400">{mod.description}</p>
        <p className="mt-5 text-sm text-ink-500">{meta.join("  ·  ")}</p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 max-w-3xl space-y-16">
          <article>
            <Markdown source={lesson} />
          </article>

          <LessonDone moduleId={mod.id} firstExerciseHref={`/modules/${mod.id}/exercices/${mod.exercises[0].id}`} />

          <section>
            <SectionTitle id="videos">En vidéo</SectionTitle>
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
              {mod.videos.map((video) => (
                <VideoCard key={video.youtubeId} video={video} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle id="aller-plus-loin">Aller plus loin</SectionTitle>
            <ResourceList resources={mod.resources} />
          </section>

          <nav className="flex justify-between gap-4 text-sm">
            {previous ? (
              <Link href={`/modules/${previous.id}`} className="group flex flex-col gap-1 text-ink-500 hover:text-ink-100">
                <span className="text-xs">Précédent</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-ink-300 group-hover:text-ink-100">
                  <ArrowLeft className="h-4 w-4" /> {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/modules/${next.id}`} className="group flex flex-col items-end gap-1 text-ink-500 hover:text-ink-100">
                <span className="text-xs">Suivant</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-ink-300 group-hover:text-ink-100">
                  {next.title} <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )}
          </nav>
        </div>

        <aside className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">
            <ModulePlan
              moduleId={mod.id}
              outline={lessonOutline(lesson)}
              exercises={mod.exercises.map(({ id, title }) => ({ id, title }))}
              quizCount={mod.quiz.length}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
