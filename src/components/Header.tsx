import Link from "next/link";
import { GlobalProgress } from "./GlobalProgress";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink-100">
          <Logo />
          Docker Playground
        </Link>
        <nav className="flex gap-1">
          <NavLink href="/">Parcours</NavLink>
          <NavLink href="/cas-pratiques">Cas pratiques</NavLink>
          <NavLink href="/aide-memoire">Aide-mémoire</NavLink>
        </nav>
        <div className="ml-auto hidden md:block">
          <GlobalProgress />
        </div>
      </div>
    </header>
  );
}
