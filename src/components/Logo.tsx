/** Logo : une baleine stylisée qui porte des conteneurs, sur fond vert. */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-neon-400" />
      {/* Conteneurs sur le dos */}
      <g className="fill-ink-950">
        <rect x="8" y="10.5" width="3.6" height="3.2" rx="0.6" />
        <rect x="12.4" y="10.5" width="3.6" height="3.2" rx="0.6" />
        <rect x="16.8" y="10.5" width="3.6" height="3.2" rx="0.6" />
        <rect x="12.4" y="6.6" width="3.6" height="3.2" rx="0.6" />
      </g>
      {/* Corps de la baleine, queue relevée à droite */}
      <path
        className="fill-ink-950"
        d="M4.5 15.2h18.2c.9 0 1.6-.5 2-1.2l1.6-2.6c.3-.5 1-.4 1.1.2l.4 1.9c.1.6.6 1 1.2 1.1l.9.1c.5.1.6.7.2 1l-1.8 1.3c-.5.4-.8 1-.9 1.6-.6 4.6-5 8-11.6 8C9.6 25.6 5.2 22 4.5 15.2z"
      />
      {/* Œil et ventre */}
      <circle cx="9.3" cy="18.6" r="1" className="fill-neon-400" />
      <path d="M7.6 21.6c2.3 1.6 5.6 2.2 9 1.6" className="stroke-neon-400" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}
