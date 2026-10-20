"use client";

import Link from "next/link";
import { useState } from "react";
import { saveQuizScore } from "@/lib/progress";
import type { QuizQuestion } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { RichText } from "./RichText";

type QuizProps = {
  moduleId: string;
  questions: QuizQuestion[];
  nextHref: string;
  nextLabel: string;
};

export function Quiz({ moduleId, questions, nextHref, nextLabel }: QuizProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const answered = selected !== null;

  function choose(choice: number) {
    if (answered) return;
    setSelected(choice);
    if (choice === question.answer) setScore((value) => value + 1);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    saveQuizScore(moduleId, Math.round((score / questions.length) * 100));
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl">{percent >= 80 ? "🏆" : percent >= 50 ? "👍" : "📚"}</p>
        <h2 className="mt-4 text-2xl font-bold text-brand-950">
          {score} / {questions.length} bonnes réponses
        </h2>
        <p className="mt-2 text-brand-800">
          {percent >= 80
            ? "Excellent, ce module est maîtrisé !"
            : percent >= 50
              ? "Pas mal ! Refais les exercices pour consolider."
              : "Reprends les exercices du module puis retente le quiz."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            ↺ Recommencer
          </button>
          <Link href={nextHref} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            {nextLabel} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-4 text-sm text-brand-700">
        <span className="tabular-nums">
          Question {index + 1} / {questions.length}
        </span>
        <ProgressBar value={index + (answered ? 1 : 0)} max={questions.length} className="flex-1" />
      </div>

      <h2 className="text-lg font-semibold text-brand-950">
        <RichText text={question.question} />
      </h2>

      <div className="mt-5 grid gap-3">
        {question.choices.map((choice, choiceIndex) => {
          const isCorrect = choiceIndex === question.answer;
          const isSelected = choiceIndex === selected;
          const style = !answered
            ? "border-brand-100 hover:border-brand-400 hover:bg-brand-50"
            : isCorrect
              ? "border-brand-600 bg-brand-50 text-brand-900"
              : isSelected
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-brand-100 opacity-60";
          return (
            <button
              key={choiceIndex}
              type="button"
              onClick={() => choose(choiceIndex)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${style}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {answered && isCorrect ? "✓" : answered && isSelected ? "✗" : String.fromCharCode(65 + choiceIndex)}
              </span>
              <span>
                <RichText text={choice} />
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 space-y-4">
          <p className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
            <strong>{selected === question.answer ? "Bonne réponse ! " : "Raté. "}</strong>
            <RichText text={question.explanation} />
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {index + 1 < questions.length ? "Question suivante →" : "Voir mon score"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
