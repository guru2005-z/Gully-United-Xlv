interface LogoProps {
  className?: string;
  compact?: boolean;
}

/**
 * Typographic GU emblem placeholder. Replace the <svg> emblem with the
 * supplied Gully United XLV logo file when it is available.
 */
export function Emblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Gully United XLV emblem">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontFamily="Anton, sans-serif"
        fontSize="38"
        letterSpacing="-1"
        fill="currentColor"
      >
        GU
      </text>
      <path d="M18 78 L82 78" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ className = "", compact = false }: LogoProps) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Emblem className="h-9 w-9 shrink-0 text-primary" />
      {!compact && (
        <span className="display leading-none">
          <span className="block text-[0.95rem] tracking-[0.18em] text-foreground">GULLY UNITED</span>
          <span className="block text-[0.7rem] tracking-[0.55em] text-primary">XLV</span>
        </span>
      )}
    </span>
  );
}
