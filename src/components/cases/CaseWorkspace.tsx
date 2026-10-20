"use client";

import { ArrowLeft, Check, Clock, Lightbulb, RotateCcw, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCase } from "@/lib/cases/catalog";
import { type CaseEvaluation, evaluate } from "@/lib/cases/scoring";
import { HINT_PENALTY } from "@/lib/cases/types";
import { saveCaseResult, useProgress } from "@/lib/progress";
import { createEnvironment, type SimState } from "@/lib/simulator";
import { PROJECT_DIR } from "@/lib/simulator/state";
import { CodeEditor } from "../CodeEditor";
import { Markdown } from "../course/Markdown";
import { useSimulator } from "../exercise/useSimulator";
import { Terminal } from "../Terminal";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { FileExplorer } from "./FileExplorer";

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

type Metrics = { commands: number; errors: number };

/** Une tentative : l'environnement est recréé à chaque « Recommencer » grâce à la clé du composant. */
export function CaseWorkspace({ caseId }: { caseId: string }) {
  const [attempt, setAttempt] = useState(0);
  return <Attempt key={attempt} caseId={caseId} onRestart={() => setAttempt((value) => value + 1)} />;
}

function Attempt({ caseId, onRestart }: { caseId: string; onRestart: () => void }) {
  const practice = getCase(caseId)!;
  const best = useProgress().caseResults[caseId];
  const [initial] = useState<SimState>(() => createEnvironment(practice.setup));
  const [metrics, setMetrics] = useState<Metrics>({ commands: 0, errors: 0 });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hints, setHints] = useState<string[]>([]);
  const [report, setReport] = useState<(CaseEvaluation & { timeMs: number; delivery: number }) | null>(null);
  const [tab, setTab] = useState<"mission" | "report">("mission");
  const deliveries = useRef(0);

  const terminal = useSimulator(
    practice.setup,
    ({ result }) => {
      setMetrics((value) => ({ commands: value.commands + 1, errors: value.errors + (result.exitCode === 0 ? 0 : 1) }));
    },
    initial,
  );
  const start = () => setStartedAt((value) => value ?? Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const projectFiles = useMemo(
    () =>
      Object.keys(terminal.state.files)
        .filter((path) => path.startsWith(`${PROJECT_DIR}/`))
        .map((path) => path.slice(PROJECT_DIR.length + 1))
        .sort(),
    [terminal.state.files],
  );
  const [selected, setSelected] = useState<string | null>(
    () => ["compose.yaml", "Dockerfile", "README.md"].find((name) => projectFiles.includes(name)) ?? projectFiles[0] ?? null,
  );
  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);

  function deliver() {
    const timeMs = startedAt === null ? 0 : Date.now() - startedAt;
    const evaluation = evaluate(practice, terminal.state, initial, hints.length);
    deliveries.current += 1;
    saveCaseResult(practice.id, evaluation.score, timeMs);
    setReport({ ...evaluation, timeMs, delivery: deliveries.current });
    setTab("report");
  }

  function revealHint(id: string) {
    start();
    setHints((value) => (value.includes(id) ? value : [...value, id]));
  }

  const resultOf = (id: string) => report?.results.find((result) => result.id === id)?.passed;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-10 flex flex-col bg-ink-900">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-800 px-4">
        <Link href="/cas-pratiques" className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" /> Cas pratiques
        </Link>
        <span className="h-5 w-px bg-ink-700" />
        <h1 className="truncate font-medium text-ink-100">{practice.title}</h1>
        <span className="hidden rounded-full border border-ink-700 px-2 py-0.5 text-xs text-ink-400 sm:inline">{practice.level}</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden items-center gap-1.5 font-mono text-sm tabular-nums text-ink-300 md:flex" title="Temps écoulé">
            <Clock className="h-4 w-4 text-ink-500" /> {formatDuration(elapsed)}
          </span>
          <span className="hidden font-mono text-xs text-ink-500 lg:inline">
            {metrics.commands} commandes · {hints.length} indice{hints.length > 1 ? "s" : ""}
          </span>
          <ConfirmDialog
            title="Recommencer le cas pratique ?"
            description="L'environnement revient à son état de départ : fichiers, conteneurs, images et chronomètre. Ton meilleur résultat reste enregistré."
            confirmLabel="Recommencer"
            onConfirm={onRestart}
            trigger={(open) => (
              <Button variant="ghost" size="sm" onClick={open}>
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </Button>
            )}
          />
          <Button variant="primary" size="sm" onClick={deliver}>
            <Send className="h-3.5 w-3.5" /> Livrer
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-ink-800">
          <div className="flex shrink-0 gap-1 border-b border-ink-800 px-3 py-2" role="tablist">
            {(["mission", "report"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                disabled={name === "report" && !report}
                onClick={() => setTab(name)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${tab === name ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
              >
                {name === "mission" ? "Mission" : "Résultat"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "mission" ? (
              <>
                <div className="text-sm [&_p]:my-2 [&_p]:text-sm [&_p]:leading-6 [&_ul]:my-2 [&_ul]:text-sm [&_ul]:leading-6">
                  {/* Les lignes d'en-tête du ticket (« **De :** … ») restent sur des lignes distinctes. */}
                  <Markdown source={practice.brief.replace(/^(\*\*.+)$/gm, "$1  ")} />
                </div>

                <h2 className="mb-3 mt-8 text-sm font-medium text-ink-100">Critères d&apos;acceptation</h2>
                <ul className="space-y-2">
                  {practice.objectives.map((objective) => {
                    const passed = resultOf(objective.id);
                    const hinted = hints.includes(objective.id);
                    return (
                      <li key={objective.id} className="rounded-lg border border-ink-800 bg-ink-850 px-3 py-2.5">
                        <div className="flex gap-2.5">
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                              passed === undefined
                                ? "border border-ink-600"
                                : passed
                                  ? "bg-neon-400 text-ink-950"
                                  : "bg-danger text-ink-950"
                            }`}
                          >
                            {passed === true && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                            {passed === false && <X className="h-2.5 w-2.5" strokeWidth={4} />}
                          </span>
                          <p className="flex-1 text-sm leading-snug text-ink-200">{objective.label}</p>
                          <span className="shrink-0 font-mono text-xs text-ink-500">{objective.points} pts</span>
                        </div>
                        {hinted ? (
                          <p className="mt-2 border-t border-ink-800 pt-2 pl-6.5 text-xs leading-relaxed text-ink-400">{objective.hint}</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revealHint(objective.id)}
                            className="mt-1.5 ml-6.5 inline-flex items-center gap-1 text-xs text-ink-500 transition-colors hover:text-neon-400"
                          >
                            <Lightbulb className="h-3 w-3" /> Indice (−{HINT_PENALTY} pts)
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-ink-500">
                  Les critères sont vérifiés sur l&apos;état réel de l&apos;environnement au moment où tu cliques sur{" "}
                  <strong className="text-ink-300">Livrer</strong>. Tu peux livrer plusieurs fois : ton meilleur résultat est conservé.
                </p>
              </>
            ) : (
              report && (
                <Report
                  report={report}
                  metrics={metrics}
                  hints={hints.length}
                  bestScore={best?.bestScore}
                  onBack={() => setTab("mission")}
                />
              )
            )}
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[minmax(0,44fr)_minmax(0,56fr)] gap-3 p-3">
          <div className="grid min-h-0 grid-cols-[200px_minmax(0,1fr)] overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
            <div className="min-h-0 border-r border-ink-800">
              <FileExplorer
                files={projectFiles}
                selected={selected}
                onSelect={setSelected}
                onCreate={(path) => {
                  start();
                  if (!projectFiles.includes(path)) terminal.writeFile(`${PROJECT_DIR}/${path}`, "");
                  setSelected(path);
                }}
              />
            </div>
            {selected && terminal.state.files[`${PROJECT_DIR}/${selected}`] !== undefined ? (
              <CodeEditor
                key={selected}
                fileName={selected}
                value={terminal.state.files[`${PROJECT_DIR}/${selected}`]}
                onChange={(content) => {
                  start();
                  terminal.writeFile(`${PROJECT_DIR}/${selected}`, content);
                }}
                submitLabel="Enregistrement automatique"
                className="h-full rounded-none border-0"
              />
            ) : (
              <p className="grid place-items-center text-sm text-ink-500">Sélectionne ou crée un fichier.</p>
            )}
          </div>
          <Terminal
            title={terminal.title}
            lines={terminal.lines}
            prompt={terminal.activePrompt}
            onSubmit={(value) => {
              if (value.trim()) start();
              terminal.submit(value);
            }}
            onInterrupt={terminal.interrupt}
            onClear={terminal.clear}
            onComplete={terminal.complete}
            className="h-full min-h-0"
          />
        </section>
      </div>
    </div>
  );
}

type ReportProps = {
  report: CaseEvaluation & { timeMs: number; delivery: number };
  metrics: Metrics;
  hints: number;
  bestScore?: number;
  onBack: () => void;
};

function Report({ report, metrics, hints, bestScore, onBack }: ReportProps) {
  const passed = report.results.filter((result) => result.passed).length;
  const stats = [
    ["Temps", formatDuration(report.timeMs)],
    ["Critères validés", `${passed}/${report.results.length}`],
    ["Commandes", String(metrics.commands)],
    ["Commandes en erreur", String(metrics.errors)],
    ["Indices", `${hints} (−${hints * HINT_PENALTY} pts)`],
    ["Livraison", `n° ${report.delivery}`],
  ];
  return (
    <div>
      <p className="text-sm text-ink-400">Score de la livraison</p>
      <p className={`mt-1 text-6xl font-semibold tabular-nums tracking-tight ${report.score === 100 ? "text-neon-400" : "text-ink-100"}`}>
        {report.score}
        <span className="text-2xl text-ink-500">/100</span>
      </p>
      <p className="mt-2 text-sm text-ink-400">
        {report.score === 100
          ? "Livraison parfaite : tous les critères sont respectés."
          : report.score >= 70
            ? "Presque : corrige les critères en rouge et livre à nouveau."
            : "Plusieurs critères ne sont pas remplis. Reprends la mission point par point."}
        {bestScore !== undefined && ` Meilleur score : ${bestScore}/100.`}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-800 bg-ink-800">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-ink-850 px-3 py-2.5">
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink-100">{value}</dd>
          </div>
        ))}
      </dl>
      <Button className="mt-6 w-full" onClick={onBack}>
        Revoir les critères
      </Button>
    </div>
  );
}
