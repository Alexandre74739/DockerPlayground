"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" || pathname.startsWith("/modules") : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "text-white" : "text-ink-400 hover:text-ink-100"}`}
    >
      {children}
      {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-neon-400" />}
    </Link>
  );
}
