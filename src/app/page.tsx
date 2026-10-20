import Image from "next/image";
import { ContinueButton } from "@/components/ContinueButton";
import { VideoCard } from "@/components/course/VideoCard";
import { TrackList } from "@/components/TrackList";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { cases } from "@/lib/cases/catalog";
import { featuredVideos, getModule, modules, tracks } from "@/lib/content";

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
  return (
    <div className="space-y-24">
      <section className="grid items-center gap-12 py-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm font-medium text-neon-400">Apprendre Docker par la pratique</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-100 sm:text-[3.25rem]">
            Maîtrise la ligne de commande Docker.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-400">
            Des cours concis, un terminal simulé qui réagit comme le vrai, des exercices guidés et des cas pratiques notés : de Docker
            Desktop à la mise en production en équipe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ContinueButton />
            <ButtonLink href="/aide-memoire">Aide-mémoire</ButtonLink>
          </div>
        </div>
        <div className="hidden justify-center lg:flex">
          {/* Logo officiel Docker (kit presse docker.com), version blanche pour fond sombre. */}
          <Image
            src="/brand/docker-logo-white.svg"
            alt="Docker"
            width={1250}
            height={268}
            priority
            unoptimized
            className="w-full max-w-md"
          />
        </div>
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

      <TrackList
        tracks={tracks.map((track) => ({
          id: track.id,
          title: track.title,
          description: track.description,
          modules: track.moduleIds.map((moduleId) => {
            const mod = getModule(moduleId)!;
            return {
              id: mod.id,
              title: mod.title,
              description: mod.description,
              icon: mod.icon,
              position: modules.indexOf(mod) + 1,
              exerciseIds: mod.exercises.map((exercise) => exercise.id),
            };
          }),
        }))}
      />

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-ink-800 bg-ink-850 px-8 py-8">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-neon-400">Cas pratiques</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink-100">Entraîne-toi en conditions réelles</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {cases.length} missions tirées du quotidien d&apos;une équipe — dockeriser un service, publier une release, résoudre un incident
            — notées sur 100 et chronométrées.
          </p>
        </div>
        <ButtonLink href="/cas-pratiques" variant="primary">
          Voir les cas pratiques <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </section>

      <section>
        <SectionHeading
          title="Cours complets en vidéo"
          description="Pour tout revoir d'une traite."
          action={
            <ButtonLink href="/ressources" size="sm">
              Voir plus de ressources <ArrowRight className="h-3.5 w-3.5" />
            </ButtonLink>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {featuredVideos.map((video) => (
            <VideoCard key={video.youtubeId} video={video} />
          ))}
        </div>
      </section>
    </div>
  );
}
