import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-neon-400 text-ink-950 hover:bg-neon-300",
  secondary: "border border-ink-600 bg-ink-850 text-ink-100 hover:border-azure-400 hover:text-white",
  ghost: "text-ink-300 hover:bg-ink-800 hover:text-white",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type ButtonLinkProps = { href: string; variant?: Variant; className?: string; children: ReactNode; external?: boolean };

export function ButtonLink({ href, variant = "secondary", className = "", children, external }: ButtonLinkProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
