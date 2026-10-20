"use client";

import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { saveQuizScore } from "@/lib/progress";
import type { QuizQuestion } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { RichText } from "./RichText";
import { Button, ButtonLink } from "./ui/Button";

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
      <div className="rounded-xl border border-ink-800 bg-ink-850 px-8 py-12 text-center">
        <p className="text-sm text-ink-400">Ton score</p>
        <p className={`mt-2 text-6xl font-semibold tabular-nums tracking-tight ${percent >= 80 ? "text-neon-400" : "text-ink-100"}`}>
          {percent}%
        </p>
        <p className="mx-auto mt-4 max-w-sm text-ink-400">
          {score} bonnes réponses sur {questions.length}.{" "}
          {percent >= 80
            ? "Module maîtrisé."
            : percent >= 50
              ? "Refais les exercices pour consolider."
              : "Relis le cours puis retente ta chance."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Recommencer
          </Button>
          <ButtonLink href={nextHref} variant="primary">
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <ProgressBar value={index + (answered ? 1 : 0)} max={questions.length} className="flex-1" />
        <span className="font-mono text-xs tabular-nums text-ink-500">
          {index + 1}/{questions.length}
        </span>
      </div>

      <h2 className="text-xl font-medium leading-relaxed text-ink-100">
        <RichText text={question.question} />
      </h2>

      <div className="mt-6 grid gap-2">
        {question.choices.map((choice, choiceIndex) => {
          const isCorrect = choiceIndex === question.answer;
          const isSelected = choiceIndex === selected;
          const style = !answered
            ? "border-ink-800 bg-ink-850 hover:border-ink-600"
            : isCorrect
              ? "border-neon-400/60 bg-neon-950"
              : isSelected
                ? "border-danger/50 bg-ink-850"
                : "border-ink-800 bg-ink-850 opacity-50";
          return (
            <button
              key={choiceIndex}
              type="button"
              onClick={() => choose(choiceIndex)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-[15px] text-ink-100 transition-colors ${style}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-xs ${
                  answered && isCorrect
                    ? "bg-neon-400 text-ink-950"
                    : answered && isSelected
                      ? "bg-danger text-ink-950"
                      : "bg-ink-800 text-ink-400"
                }`}
              >
                {answered && isCorrect ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : answered && isSelected ? (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + choiceIndex)
                )}
              </span>
              <span>
                <RichText text={choice} />
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-lg text-sm leading-relaxed text-ink-400">
            <strong className={selected === question.answer ? "font-medium text-neon-400" : "font-medium text-danger"}>
              {selected === question.answer ? "Bonne réponse. " : "Mauvaise réponse. "}
            </strong>
            <RichText text={question.explanation} />
          </p>
          <Button variant="primary" onClick={next}>
            {index + 1 < questions.length ? "Question suivante" : "Voir mon score"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
