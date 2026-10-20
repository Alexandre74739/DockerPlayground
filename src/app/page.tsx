import Link from "next/link";
import { ModuleCard } from "@/components/ModuleCard";
import { ResetProgressButton } from "@/components/ResetProgressButton";
import { modules } from "@/lib/content";

export default function HomePage() {
  const first = modules[0];

  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-12 text-white sm:px-10">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-200">Apprendre en pratiquant</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          Maîtrise la ligne de commande Docker, une commande à la fois.
        </h1>
        <p className="mt-4 max-w-2xl text-brand-100">
          Des exercices dans un terminal simulé, des Dockerfile et compose.yaml à écrire directement dans
          l&apos;éditeur, et un quiz à la fin de chaque module. Ta progression est enregistrée sur cette machine.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/modules/${first.id}/exercices/${first.exercises[0].id}`}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Commencer le parcours →
          </Link>
          <Link
            href="/aide-memoire"
            className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            Ouvrir l&apos;aide-mémoire
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold text-brand-950">Parcours</h2>
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
                exerciseIds: mod.exercises.map((exercise) => exercise.id),
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
