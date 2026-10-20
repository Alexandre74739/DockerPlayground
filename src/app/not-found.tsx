import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <pre className="inline-block rounded-xl border border-ink-700 bg-ink-950 px-5 py-4 text-left font-mono text-sm text-ink-300">
        <span className="text-neon-400">$</span> docker run page{"\n"}Error response from daemon: No such page
      </pre>
      <h1 className="mt-8 text-2xl font-semibold text-white">Page introuvable</h1>
      <div className="mt-6">
        <ButtonLink href="/">
          <ArrowLeft className="h-4 w-4" /> Retour au parcours
        </ButtonLink>
      </div>
    </div>
  );
}
