/** Logo : trois conteneurs empilés, sans emoji. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-neon-400" />
      <rect x="7" y="17" width="8" height="7" rx="1.5" className="fill-ink-950" />
      <rect x="17" y="17" width="8" height="7" rx="1.5" className="fill-ink-950" />
      <rect x="12" y="8" width="8" height="7" rx="1.5" className="fill-azure-600" />
    </svg>
  );
}
