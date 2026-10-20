"use client";

import { RotateCcw } from "lucide-react";
import { resetProgress } from "@/lib/progress";

export function ResetProgressButton() {
  function handleClick() {
    if (window.confirm("Effacer toute ta progression ?")) resetProgress();
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-500 hover:text-ink-200"
    >
      <RotateCcw className="h-3 w-3" /> réinitialiser
    </button>
  );
}
