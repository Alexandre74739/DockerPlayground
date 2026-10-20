"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const SYMBOLS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", b: "B", a: "A" };

/** Easter egg : le code Konami, affiché dans le pied de page, ouvre une image en plein écran. */
export function KonamiCode() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let position = 0;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") return setOpen(false);
      // On ne capte pas les touches tapées dans un champ (terminal, éditeur, recherche).
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      position = key === SEQUENCE[position] ? position + 1 : key === SEQUENCE[0] ? 1 : 0;
      if (position === SEQUENCE.length) {
        position = 0;
        setOpen(true);
      }
      setProgress(position);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const keys = (
    <span
      className="flex items-center gap-1 font-mono"
      aria-label="Code Konami : haut, haut, bas, bas, gauche, droite, gauche, droite, B, A"
    >
      {SEQUENCE.map((key, index) => (
        <kbd
          key={index}
          className={`rounded border px-1.5 py-0.5 text-[11px] transition-colors ${index < progress ? "border-neon-400/60 text-neon-400" : "border-ink-700 text-ink-500"}`}
        >
          {SYMBOLS[key]}
        </kbd>
      ))}
    </span>
  );

  if (!open) return keys;
  return (
    <>
      {keys}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tu te crois vraiment malin ? Et bien non"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-ink-800 text-ink-100 transition-colors hover:bg-ink-700"
        >
          <X className="h-5 w-5" />
        </button>
        <Image
          src="/easter-egg/tu-te-crois-malin.png"
          alt="Tu te crois vraiment malin ? Et bien non"
          width={730}
          height={717}
          priority
          onClick={(event) => event.stopPropagation()}
          className="h-auto max-h-[85vh] w-auto max-w-full rounded-xl shadow-2xl"
        />
      </div>
    </>
  );
}
