import Link from "next/link";
import { GlobalProgress } from "./GlobalProgress";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">🐳</span>
          Docker Playground
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 text-brand-800 hover:bg-brand-50">
            Parcours
          </Link>
          <Link href="/aide-memoire" className="rounded-md px-3 py-1.5 text-brand-800 hover:bg-brand-50">
            Aide-mémoire
          </Link>
        </nav>
        <div className="ml-auto hidden sm:block">
          <GlobalProgress />
        </div>
      </div>
    </header>
  );
}
