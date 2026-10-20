"use client";

import { resetProgress } from "@/lib/progress";

export function ResetProgressButton() {
  function handleClick() {
    if (window.confirm("Effacer toute ta progression ?")) resetProgress();
  }
  return (
    <button type="button" onClick={handleClick} className="text-xs text-brand-400 hover:text-brand-600 hover:underline">
      Réinitialiser ma progression
    </button>
  );
}
