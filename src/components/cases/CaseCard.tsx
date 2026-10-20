"use client";

import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useProgress } from "@/lib/progress";
import { formatDuration } from "./CaseWorkspace";

type CaseCardProps = {
  id: string;
  title: string;
  level: string;
  duration: string;
  skills: string[];
  summary: string;
};

export function CaseCard({ id, title, level, duration, skills, summary }: CaseCardProps) {
  const result = useProgress().caseResults[id];
  return (
    <Link
      href={`/cas-pratiques/${id}`}
      className="group flex flex-col rounded-xl border border-ink-800 bg-ink-850 p-5 transition-colors hover:border-ink-600"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full border border-ink-700 px-2 py-0.5 text-ink-400">{level}</span>
        <span className="inline-flex items-center gap-1 text-ink-500">
          <Clock className="h-3.5 w-3.5" /> {duration}
        </span>
      </div>
      <h3 className="mt-4 font-medium text-ink-100">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-400">{summary}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <li key={skill} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">
            {skill}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-ink-800 pt-4 text-sm">
        {result ? (
          <span className="text-ink-400">
            Meilleur score{" "}
            <span className={`font-mono ${result.bestScore === 100 ? "text-neon-400" : "text-ink-100"}`}>{result.bestScore}/100</span> ·{" "}
            <span className="font-mono">{formatDuration(result.bestTimeMs)}</span>
          </span>
        ) : (
          <span className="text-ink-500">Pas encore tenté</span>
        )}
        <ArrowRight className="h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-neon-400" />
      </div>
    </Link>
  );
}
