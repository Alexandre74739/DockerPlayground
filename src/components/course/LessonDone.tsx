"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { markLessonRead, useProgress } from "@/lib/progress";
import { Button } from "../ui/Button";

export function LessonDone({ moduleId, firstExerciseHref }: { moduleId: string; firstExerciseHref: string }) {
  const router = useRouter();
  const read = useProgress().lessonsRead.includes(moduleId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neon-400/30 bg-neon-950/40 p-5">
      <div>
        <p className="font-medium text-white">{read ? "Cours lu" : "Tu as terminé la lecture ?"}</p>
        <p className="text-sm text-ink-400">Passe à la pratique dans le terminal.</p>
      </div>
      <Button
        variant="primary"
        onClick={() => {
          markLessonRead(moduleId);
          router.push(firstExerciseHref);
        }}
      >
        {read ? <Check className="h-4 w-4" /> : null}
        Commencer les exercices <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
