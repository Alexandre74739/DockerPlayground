"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type TerminalLine = {
  kind: "input" | "output" | "error" | "info" | "success";
  text: string;
};

type TerminalProps = {
  /** Traite une commande et renvoie les lignes à afficher. */
  onCommand: (command: string) => TerminalLine[];
  disabled?: boolean;
  placeholder?: string;
  welcome?: TerminalLine[];
};

const lineStyles: Record<TerminalLine["kind"], string> = {
  input: "text-white",
  output: "text-brand-100",
  error: "text-rose-300",
  info: "text-brand-300",
  success: "text-emerald-300",
};

/** Terminal simulé : saisie, historique (flèches ↑/↓) et commande `clear`. */
export function Terminal({ onCommand, disabled = false, placeholder, welcome = [] }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>(welcome);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);

  function submit() {
    const command = value.trim();
    setValue("");
    setHistoryIndex(null);
    if (!command) return;

    setHistory((previous) => [...previous, command]);
    if (command === "clear") {
      setLines([]);
      return;
    }
    setLines((previous) => [...previous, { kind: "input", text: command }, ...onCommand(command)]);
  }

  function navigateHistory(direction: -1 | 1) {
    if (history.length === 0) return;
    const start = historyIndex ?? history.length;
    const next = Math.min(Math.max(start + direction, 0), history.length);
    setHistoryIndex(next === history.length ? null : next);
    setValue(history[next] ?? "");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") submit();
    else if (event.key === "ArrowUp") {
      event.preventDefault();
      navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      navigateHistory(1);
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setLines([]);
    }
  }

  return (
    <div
      className="flex h-full min-h-80 flex-col overflow-hidden rounded-xl bg-terminal shadow-lg ring-1 ring-brand-900/40"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-brand-400/70" />
        <span className="h-3 w-3 rounded-full bg-brand-300/50" />
        <span className="h-3 w-3 rounded-full bg-brand-200/30" />
        <span className="ml-2 font-mono text-xs text-brand-300">terminal — bash</span>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
        {lines.map((line, index) => (
          <pre
            key={index}
            // Les sorties (tableaux) gardent leur alignement ; le reste passe à la ligne.
            className={`${line.kind === "output" ? "whitespace-pre" : "whitespace-pre-wrap break-words"} ${lineStyles[line.kind]}`}
          >
            {line.kind === "input" ? <span className="text-brand-400">$ </span> : null}
            {line.text}
          </pre>
        ))}

        <div className="flex items-center" ref={bottomRef}>
          <span className="text-brand-400">$&nbsp;</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Saisir une commande"
            className="flex-1 bg-transparent text-white caret-brand-300 outline-none placeholder:text-brand-300/40 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
