"use client";

import { useRef, type KeyboardEvent } from "react";

type CodeEditorProps = {
  fileName: string;
  value: string;
  onChange: (value: string) => void;
  /** Ctrl+Entrée. */
  onSubmit?: () => void;
  submitLabel?: string;
  className?: string;
};

const INDENT = "  ";

/** Éditeur de code léger façon IDE : numéros de ligne, Tab pour indenter, Ctrl+Entrée pour vérifier. */
export function CodeEditor({
  fileName,
  value,
  onChange,
  onSubmit,
  submitLabel = "Ctrl + Entrée pour vérifier",
  className,
}: CodeEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = value.split("\n").length;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    onChange(value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd));
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + INDENT.length;
    });
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-950 ${className ?? "h-[min(600px,calc(100vh-21rem))] min-h-[380px]"}`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ink-800 px-4">
        <span className="font-mono text-xs text-ink-200">{fileName}</span>
        {submitLabel && <span className="text-xs text-ink-500">{submitLabel}</span>}
      </div>
      <div className="flex min-h-0 flex-1 font-mono text-[13px] leading-6">
        <div ref={gutterRef} aria-hidden className="select-none overflow-hidden py-3 pl-4 pr-3 text-right text-ink-600">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          spellCheck={false}
          autoFocus
          wrap="off"
          aria-label={`Contenu du fichier ${fileName}`}
          className="flex-1 resize-none bg-transparent py-3 pr-4 pl-2 text-ink-100 caret-neon-400 outline-none"
        />
      </div>
    </div>
  );
}
