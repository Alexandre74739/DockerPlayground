import type { Metadata } from "next";
import { CaseList } from "@/components/cases/CaseList";
import { cases } from "@/lib/cases/catalog";
import type { CaseLevel } from "@/lib/cases/types";

export const metadata: Metadata = { title: "Cas pratiques · Docker Playground" };

const LEVELS: CaseLevel[] = ["Débutant", "Intermédiaire", "Avancé"];

const RULES = [
  ["Conditions réelles", "Pas d'étapes guidées : un ticket, un projet, un terminal et un éditeur. À toi de t'organiser."],
  [
    "Évaluation mesurable",
    "Chaque critère d'acceptation est vérifié sur l'état réel de l'environnement : conteneurs, images, fichiers, Docker Hub.",
  ],
  [
    "Score sur 100",
    "Chronomètre, commandes, erreurs et indices sont enregistrés. Chaque indice coûte 5 points ; ton meilleur résultat est conservé.",
  ],
];

export default function CasesPage() {
  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-neon-400">Travaux dirigés</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-100">Cas pratiques</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-400">
          Des missions tirées du quotidien d&apos;une équipe : dockeriser un service, monter un environnement, publier une release, résoudre
          un incident.
        </p>
      </header>

      <section className="grid gap-8 border-y border-ink-800 py-10 md:grid-cols-3">
        {RULES.map(([title, text], index) => (
          <div key={title} className="flex gap-4">
            <span className="font-mono text-sm text-neon-400">0{index + 1}</span>
            <div>
              <h2 className="font-medium text-ink-100">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-400">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <CaseList
        levels={LEVELS}
        cases={cases.map(({ id, title, level, duration, skills, summary }) => ({ id, title, level, duration, skills, summary }))}
      />
    </div>
  );
}
