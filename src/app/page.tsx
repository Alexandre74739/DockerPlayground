import { ContinueButton } from "@/components/ContinueButton";
import { VideoCard } from "@/components/course/VideoCard";
import { HeroTerminal } from "@/components/HeroTerminal";
import { ModuleCard } from "@/components/ModuleCard";
import { ResetProgressButton } from "@/components/ResetProgressButton";
import { ButtonLink } from "@/components/ui/Button";
import { featuredVideos, modules, totalExercises } from "@/lib/content";

const STEPS = [
  { title: "Comprendre", text: "Un cours court par module, complété par des vidéos." },
  { title: "Pratiquer", text: "Un terminal qui répond comme le vrai. À toi de trouver la commande." },
  { title: "Valider", text: "Un quiz par module, puis des labs en ligne pour aller plus loin." },
];

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-100">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  const stats = [
    { value: modules.length, label: "modules" },
    { value: totalExercises, label: "exercices" },
    { value: modules.reduce((sum, mod) => sum + mod.quiz.length, 0), label: "questions" },
    { value: modules.reduce((sum, mod) => sum + mod.videos.length, 0) + featuredVideos.length, label: "vidéos" },
  ];

  return (
    <div className="space-y-24">
      <section className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm font-medium text-neon-400">Apprendre Docker par la pratique</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-100 sm:text-[3.25rem]">
            Maîtrise la ligne de commande Docker.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-400">
            Des cours concis, un terminal simulé qui réagit comme le vrai et des exercices guidés, de Docker Desktop jusqu&apos;à Docker
            Hub.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ContinueButton />
            <ButtonLink href="/aide-memoire">Aide-mémoire</ButtonLink>
          </div>
          <dl className="mt-12 flex divide-x divide-ink-700">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 first:pl-0">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums text-ink-100">{stat.value}</dd>
                <dd className="text-sm text-ink-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroTerminal />
      </section>

      <section className="grid gap-8 border-y border-ink-800 py-10 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex gap-4">
            <span className="font-mono text-sm text-neon-400">0{index + 1}</span>
            <div>
              <h2 className="font-medium text-ink-100">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-400">{step.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionHeading
          title="Parcours"
          description="Huit modules, du premier conteneur à la publication sur Docker Hub."
          action={<ResetProgressButton />}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((mod, index) => (
            <ModuleCard
              key={mod.id}
              position={index + 1}
              mod={{
                id: mod.id,
                title: mod.title,
                description: mod.description,
                icon: mod.icon,
                exerciseIds: mod.exercises.map((exercise) => exercise.id),
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Cours complets en vidéo" description="Pour tout revoir d'une traite." />
        <div className="grid gap-4 md:grid-cols-3">
          {featuredVideos.map((video) => (
            <VideoCard key={video.youtubeId} video={video} />
          ))}
        </div>
      </section>
    </div>
  );
}
