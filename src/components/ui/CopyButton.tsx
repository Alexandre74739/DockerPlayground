"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

/** Copie un texte dans le presse-papiers, avec confirmation visuelle. */
export function CopyButton({ text, label = "Copier", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers refusé par le navigateur : rien à faire.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100 ${className}`}
      aria-label={copied ? "Copié" : label}
      title={copied ? "Copié" : label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-neon-400" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="sr-only">{copied ? "Copié" : label}</span>
    </button>
  );
}
