import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

const variants: Record<Variant, string> = {
  primary: "bg-neon-400 text-ink-950 hover:bg-neon-300",
  secondary: "border border-ink-700 bg-ink-850 text-ink-100 hover:border-ink-600 hover:bg-ink-800",
  ghost: "text-ink-400 hover:bg-ink-800 hover:text-ink-100",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  return <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

type ButtonLinkProps = { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function ButtonLink({ href, variant = "secondary", size = "md", className = "", children }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
