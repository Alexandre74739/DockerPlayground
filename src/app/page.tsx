import { BookOpen, ListChecks, SquareTerminal } from "lucide-react";
import { ContinueButton } from "@/components/ContinueButton";
import { VideoCard } from "@/components/course/VideoCard";
import { HeroTerminal } from "@/components/HeroTerminal";
import { ModuleCard } from "@/components/ModuleCard";
import { ResetProgressButton } from "@/components/ResetProgressButton";
import { ButtonLink } from "@/components/ui/Button";
import { featuredVideos, modules, totalExercises } from "@/lib/content";

const STEPS = [
  { icon: BookOpen, title: "Lire le cours", text: "Les notions expliquées simplement, avec des vidéos pour approfondir." },
  {
    icon: SquareTerminal,
    title: "Pratiquer",
    text: "Un terminal qui répond comme le vrai : erreurs comprises. À toi de trouver la commande.",
  },
  {
    icon: ListChecks,
    title: "Valider",
    text: "Un quiz par module pour vérifier que c'est acquis, puis des labs en ligne pour aller plus loin.",
  },
];

export default function HomePage() {
  const stats = [
    { value: modules.length, label: "modules" },
    { value: totalExercises, label: "exercices" },
    { value: modules.reduce((sum, mod) => sum + mod.quiz.length, 0), label: "questions" },
    { value: modules.reduce((sum, mod) => sum + mod.videos.length, 0) + featuredVideos.length, label: "vidéos" },
  ];

  return (
    <div className="space-y-20">
      <section className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="bg-grid pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-azure-400">{"// apprendre docker en pratiquant"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
            La ligne de commande Docker, <span className="text-neon-400">maîtrisée.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300">
            Des cours courts, un terminal simulé qui réagit comme le vrai, des Dockerfile et compose.yaml à écrire, et un quiz pour chaque
            module. De Docker Desktop à Docker Hub.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ContinueButton />
            <ButtonLink href="/aide-memoire" className="px-5 py-2.5">
              Aide-mémoire
            </ButtonLink>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-mono text-2xl font-semibold text-white">{stat.value}</dd>
                <dd className="text-sm text-ink-400">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroTerminal />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
            <div className="flex items-center gap-3">
              <step.icon className="h-5 w-5 text-neon-400" aria-hidden />
              <span className="font-mono text-xs text-ink-500">0{index + 1}</span>
            </div>
            <h2 className="mt-3 font-semibold text-white">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{step.text}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">Parcours</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">8 modules, du premier conteneur à la publication</h2>
          </div>
          <ResetProgressButton />
        </div>
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
                videoCount: mod.videos.length,
                exerciseIds: mod.exercises.map((exercise) => exercise.id),
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">Cours complets</p>
        <h2 className="mt-2 mb-6 text-2xl font-semibold tracking-tight text-white">Tout Docker en une séance vidéo</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredVideos.map((video) => (
            <VideoCard key={video.youtubeId} video={video} />
          ))}
        </div>
      </section>
    </div>
  );
}
