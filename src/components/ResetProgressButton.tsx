"use client";

import { resetProgress } from "@/lib/progress";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export function ResetProgressButton() {
  return (
    <ConfirmDialog
      title="Réinitialiser ta progression ?"
      description="Exercices réussis, cours lus, scores des quiz et résultats des cas pratiques seront effacés. Cette action est définitive."
      confirmLabel="Tout effacer"
      onConfirm={resetProgress}
      trigger={(open) => (
        <button type="button" onClick={open} className="text-xs text-ink-500 transition-colors hover:text-ink-200">
          Réinitialiser la progression
        </button>
      )}
    />
  );
}
