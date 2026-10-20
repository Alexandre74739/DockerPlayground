"use client";

import { ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
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
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-8 text-center">
        <Trophy className={`mx-auto h-12 w-12 ${percent >= 80 ? "text-neon-400" : "text-azure-400"}`} aria-hidden />
        <p className="mt-5 font-mono text-5xl font-semibold text-white">{percent}%</p>
        <p className="mt-2 text-ink-300">
          {score} / {questions.length} bonnes réponses —{" "}
          {percent >= 80
            ? "module maîtrisé !"
            : percent >= 50
              ? "pas mal, refais les exercices pour consolider."
              : "relis le cours puis retente ta chance."}
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
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8">
      <div className="mb-7 flex items-center gap-4 font-mono text-xs text-ink-400">
        <span className="tabular-nums">
          <span className="text-neon-400">{String(index + 1).padStart(2, "0")}</span> / {String(questions.length).padStart(2, "0")}
        </span>
        <ProgressBar value={index + (answered ? 1 : 0)} max={questions.length} className="flex-1" />
      </div>

      <h2 className="text-lg font-medium leading-relaxed text-white">
        <RichText text={question.question} />
      </h2>

      <div className="mt-6 grid gap-2.5">
        {question.choices.map((choice, choiceIndex) => {
          const isCorrect = choiceIndex === question.answer;
          const isSelected = choiceIndex === selected;
          const style = !answered
            ? "border-ink-700 hover:border-azure-400 hover:bg-ink-800"
            : isCorrect
              ? "border-neon-400/70 bg-neon-950/50"
              : isSelected
                ? "border-rose-400/60 bg-rose-950/30"
                : "border-ink-700 opacity-50";
          return (
            <button
              key={choiceIndex}
              type="button"
              onClick={() => choose(choiceIndex)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-ink-100 transition ${style}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs ${
                  answered && isCorrect
                    ? "bg-neon-400 text-ink-950"
                    : answered && isSelected
                      ? "bg-rose-400 text-ink-950"
                      : "bg-ink-700 text-ink-300"
                }`}
              >
                {answered && isCorrect ? (
                  <Check className="h-4 w-4" />
                ) : answered && isSelected ? (
                  <X className="h-4 w-4" />
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
        <div className="mt-6 space-y-4">
          <p className="rounded-xl border-l-2 border-azure-400 bg-azure-950/70 px-4 py-3 text-sm leading-relaxed text-ink-200">
            <strong className={selected === question.answer ? "text-neon-400" : "text-rose-300"}>
              {selected === question.answer ? "Bonne réponse. " : "Raté. "}
            </strong>
            <RichText text={question.explanation} />
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={next}>
              {index + 1 < questions.length ? "Question suivante" : "Voir mon score"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
