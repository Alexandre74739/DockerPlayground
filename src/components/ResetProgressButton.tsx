"use client";

import { resetProgress } from "@/lib/progress";

export function ResetProgressButton() {
  function handleClick() {
    if (window.confirm("Effacer toute ta progression ?")) resetProgress();
  }
  return (
    <button type="button" onClick={handleClick} className="text-xs text-ink-500 transition-colors hover:text-ink-200">
      Réinitialiser la progression
    </button>
  );
}
