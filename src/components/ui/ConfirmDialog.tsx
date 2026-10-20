"use client";

import { TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Bouton qui ouvre la fenêtre : reçoit la fonction d'ouverture. */
  trigger: (open: () => void) => ReactNode;
};

/**
 * Fenêtre modale de confirmation (élément <dialog> natif : focus piégé,
 * Échap pour fermer, fond assombri).
 */
export function ConfirmDialog({ title, description, confirmLabel, onConfirm, trigger }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function confirm() {
    setOpen(false);
    onConfirm();
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-xl border border-ink-700 bg-ink-850 p-0 text-ink-100 shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex gap-4 p-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-800 text-neon-400">
            <TriangleAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="confirm-title" className="font-semibold text-ink-100">
              {title}
            </h2>
            <div className="mt-1.5 text-sm leading-relaxed text-ink-400">{description}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-800 bg-ink-900/60 px-6 py-4">
          <Button onClick={() => setOpen(false)} autoFocus>
            Annuler
          </Button>
          <Button variant="primary" onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
