"use client";

import { FileCode2 } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

type CodeEditorProps = {
  fileName: string;
  value: string;
  onChange: (value: string) => void;
  /** Ctrl+Entrée. */
  onSubmit?: () => void;
};

const INDENT = "  ";

/** Éditeur de code léger façon IDE : numéros de ligne, Tab pour indenter, Ctrl+Entrée pour vérifier. */
export function CodeEditor({ fileName, value, onChange, onSubmit }: CodeEditorProps) {
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
    <div className="flex h-[min(640px,calc(100vh-10rem))] min-h-[420px] flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-950 shadow-2xl shadow-black/40">
      <div className="flex shrink-0 items-end gap-1 border-b border-ink-800 bg-ink-925 px-2 pt-2">
        <span className="flex items-center gap-2 rounded-t-md border-t-2 border-neon-400 bg-ink-950 px-3 py-1.5 font-mono text-xs text-ink-100">
          <FileCode2 className="h-3.5 w-3.5 text-azure-400" aria-hidden /> {fileName}
        </span>
        <span className="ml-auto pb-1.5 pr-2 font-mono text-[11px] text-ink-500">Ctrl + Entrée : vérifier</span>
      </div>
      <div className="flex min-h-0 flex-1 font-mono text-[13px] leading-6">
        <div
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden border-r border-ink-800 py-3 pl-4 pr-3 text-right text-ink-600"
        >
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
          className="flex-1 resize-none bg-transparent px-4 py-3 text-ink-100 caret-neon-400 outline-none"
        />
      </div>
    </div>
  );
}
