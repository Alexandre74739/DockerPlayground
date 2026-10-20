import { ArrowLeft, ArrowRight, Clock, ListChecks, PlayCircle, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonDone } from "@/components/course/LessonDone";
import { Markdown } from "@/components/course/Markdown";
import { ModulePlan } from "@/components/course/ModulePlan";
import { ResourceList } from "@/components/course/ResourceList";
import { VideoCard } from "@/components/course/VideoCard";
import { ModuleIcon } from "@/components/ui/ModuleIcon";
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
    <h2 id={id} className="mb-5 scroll-mt-24 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
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
  const firstExerciseHref = `/modules/${mod.id}/exercices/${mod.exercises[0].id}`;

  return (
    <div>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 font-mono text-xs text-ink-400 hover:text-neon-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Parcours
        </Link>
        <div className="relative mt-5 flex items-start gap-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-ink-950 text-neon-400 ring-1 ring-ink-700">
            <ModuleIcon name={mod.icon} className="h-7 w-7" />
          </span>
          <div>
            <p className="font-mono text-xs text-azure-400">MODULE {String(index + 1).padStart(2, "0")}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">{mod.title}</h1>
            <p className="mt-2 max-w-2xl text-ink-300">{mod.description}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-ink-400">
              <li className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {readingMinutes(lesson)} min de lecture
              </li>
              <li className="flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" /> {mod.videos.length} vidéos
              </li>
              <li className="flex items-center gap-1.5">
                <SquareTerminal className="h-3.5 w-3.5" /> {mod.exercises.length} exercices
              </li>
              <li className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> {mod.quiz.length} questions
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-14">
          <article className="max-w-3xl">
            <Markdown source={lesson} />
          </article>

          <LessonDone moduleId={mod.id} firstExerciseHref={firstExerciseHref} />

          <section>
            <SectionTitle id="videos">En vidéo</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mod.videos.map((video) => (
                <VideoCard key={video.youtubeId} video={video} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle id="aller-plus-loin">Aller plus loin</SectionTitle>
            <ResourceList resources={mod.resources} />
          </section>

          <div className="flex justify-between border-t border-ink-700 pt-6 text-sm">
            {previous ? (
              <Link href={`/modules/${previous.id}`} className="inline-flex items-center gap-1.5 text-ink-400 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/modules/${next.id}`} className="inline-flex items-center gap-1.5 text-ink-400 hover:text-white">
                {next.title} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <aside className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">
            <ModulePlan
              moduleId={mod.id}
              outline={lessonOutline(lesson)}
              exercises={mod.exercises.map(({ id, title, kind }) => ({ id, title, kind }))}
              quizCount={mod.quiz.length}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
