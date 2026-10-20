"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { markLessonRead } from "@/lib/progress";
import { Button } from "../ui/Button";

export function LessonDone({ moduleId, firstExerciseHref }: { moduleId: string; firstExerciseHref: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-800 bg-ink-850 px-6 py-5">
      <div>
        <p className="font-medium text-ink-100">Prêt à pratiquer ?</p>
        <p className="mt-0.5 text-sm text-ink-400">Mets ce cours en application dans le terminal.</p>
      </div>
      <Button
        variant="primary"
        onClick={() => {
          markLessonRead(moduleId);
          router.push(firstExerciseHref);
        }}
      >
        Commencer les exercices <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
