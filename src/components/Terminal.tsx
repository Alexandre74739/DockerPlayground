"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

export type TerminalLine = {
  /** Invite affichée avant le texte saisi (lignes de saisie uniquement). */
  prompt?: string;
  text: string;
};

/** Invite active : shell, question (Username:, [y/N]) ou processus au premier plan (null). */
export type ActivePrompt = { text: string; kind: "shell" | "question"; mask?: boolean } | null;

type TerminalProps = {
  title: string;
  lines: TerminalLine[];
  prompt: ActivePrompt;
  onSubmit: (value: string) => void;
  onInterrupt: (value: string) => void;
  onClear: () => void;
  /** Complétion par Tab : renvoie la ligne complétée et les choix possibles. */
  onComplete?: (value: string) => { line: string; options: string[] };
  /** Taille du terminal (par défaut adaptée à l'écran). */
  className?: string;
};

/** Colore une invite de shell : « alex@pc:~/projet$ ». */
function PromptText({ text }: { text: string }) {
  const host = text.match(/^([\w-]+@[\w-]+):(.*)([$#])$/);
  if (host) {
    return (
      <>
        <span className="text-neon-400">{host[1]}</span>
        <span className="text-ink-500">:</span>
        <span className="text-ink-300">{host[2]}</span>
        <span className="text-ink-500">{host[3]} </span>
      </>
    );
  }
  return <span className="text-ink-100">{text.endsWith(" ") ? text : `${text} `}</span>;
}

/**
 * Émulateur de terminal : rendu de la ligne avec curseur bloc, historique,
 * raccourcis clavier usuels et clic droit pour copier / coller.
 */
export function Terminal({ title, lines, prompt, onSubmit, onInterrupt, onClear, onComplete, className }: TerminalProps) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [lines, value, cursor, suggestions]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function update(next: string, position = next.length) {
    setValue(next);
    setCursor(position);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(position, position));
  }

  function insert(text: string) {
    const clean = text.replace(/\r?\n/g, " ");
    update(value.slice(0, cursor) + clean + value.slice(cursor), cursor + clean.length);
  }

  function submit() {
    const line = value;
    update("");
    setHistoryIndex(null);
    setSuggestions([]);
    if (prompt?.kind === "shell" && line.trim()) setHistory((previous) => (previous.at(-1) === line ? previous : [...previous, line]));
    if (prompt?.kind === "shell" && line.trim() === "clear") return onClear();
    onSubmit(line);
  }

  function navigateHistory(direction: -1 | 1) {
    if (history.length === 0 || prompt?.kind !== "shell") return;
    const start = historyIndex ?? history.length;
    const next = Math.min(Math.max(start + direction, 0), history.length);
    setHistoryIndex(next === history.length ? null : next);
    update(history[next] ?? "");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const key = event.key;
    if (event.ctrlKey && key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      event.preventDefault();
      setSuggestions([]);
      onInterrupt(value);
      return update("");
    }
    if (event.ctrlKey && key.toLowerCase() === "l") {
      event.preventDefault();
      return onClear();
    }
    if (event.ctrlKey && key.toLowerCase() === "u") {
      event.preventDefault();
      return update(value.slice(cursor), 0);
    }
    if (key === "Enter") {
      event.preventDefault();
      return submit();
    }
    if (key === "Tab") {
      event.preventDefault();
      if (!onComplete || prompt?.kind !== "shell" || cursor !== value.length) return;
      const result = onComplete(value);
      update(result.line);
      return setSuggestions(result.options);
    }
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      return navigateHistory(key === "ArrowUp" ? -1 : 1);
    }
    setSuggestions([]);
  }

  // Clic droit : copie la sélection s'il y en a une, sinon colle le presse-papiers.
  async function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    const selection = window.getSelection();
    const selected = selection?.toString() ?? "";
    try {
      if (selected) {
        await navigator.clipboard.writeText(selected);
        selection?.removeAllRanges();
      } else if (prompt) {
        insert(await navigator.clipboard.readText());
      }
    } catch {
      // Presse-papiers refusé par le navigateur : Ctrl+Shift+V reste disponible.
    }
    inputRef.current?.focus({ preventScroll: true });
  }

  // Un clic sans sélection redonne le focus à la saisie, sans casser la sélection de texte.
  function handleMouseUp() {
    if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
  }

  const shown = prompt?.mask ? "" : value;
  const position = prompt?.mask ? 0 : cursor;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-950 ${className ?? "h-[min(600px,calc(100vh-21rem))] min-h-[380px]"}`}
    >
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-ink-800 px-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        </div>
        <span className="flex-1 truncate text-center font-mono text-xs text-ink-400">{title}</span>
        <span className="w-[42px]" aria-hidden />
      </div>

      <div
        ref={screenRef}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        className="relative flex-1 cursor-text overflow-y-auto overflow-x-hidden px-5 py-4 font-mono text-[13px] leading-[1.6] text-ink-100"
      >
        {lines.map((line, index) => (
          <pre key={index} className="whitespace-pre-wrap break-all">
            {line.prompt !== undefined && <PromptText text={line.prompt} />}
            {line.text}
          </pre>
        ))}

        {suggestions.length > 0 && <pre className="whitespace-pre-wrap text-ink-400">{suggestions.join("   ")}</pre>}

        {/* Le champ invisible suit la ligne active : le navigateur ne fait plus défiler l'écran vers le haut. */}
        <pre className="relative whitespace-pre-wrap break-all">
          {prompt && <PromptText text={prompt.text} />}
          {shown.slice(0, position)}
          <span className={focused ? "animate-cursor bg-neon-400 text-ink-950" : "outline outline-1 -outline-offset-1 outline-ink-500"}>
            {shown[position] ?? " "}
          </span>
          {shown.slice(position + 1)}
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setCursor(event.target.selectionStart ?? event.target.value.length);
            }}
            onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Saisie du terminal"
            className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
          />
        </pre>
      </div>
    </div>
  );
}
