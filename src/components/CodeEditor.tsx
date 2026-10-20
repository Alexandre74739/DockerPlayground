"use client";

import type { KeyboardEvent } from "react";

type CodeEditorProps = {
  fileName: string;
  value: string;
  onChange: (value: string) => void;
};

const INDENT = "  ";

/** Éditeur de code léger : numéros de ligne et Tab pour indenter. */
export function CodeEditor({ fileName, value, onChange }: CodeEditorProps) {
  const lineCount = value.split("\n").length;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + INDENT.length;
    });
  }

  return (
    <div className="flex h-full min-h-96 flex-col overflow-hidden rounded-xl bg-terminal shadow-lg ring-1 ring-brand-900/40">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs text-brand-100">{fileName}</span>
      </div>
      <div className="flex flex-1 overflow-auto font-mono text-sm leading-6">
        <div aria-hidden className="select-none py-4 pl-4 pr-3 text-right text-brand-300/40">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoFocus
          aria-label={`Contenu du fichier ${fileName}`}
          className="flex-1 resize-none whitespace-pre bg-transparent py-4 pr-4 text-white caret-brand-300 outline-none"
          style={{ height: `${Math.max(lineCount, 16) * 1.5 + 2}rem` }}
        />
      </div>
    </div>
  );
}
