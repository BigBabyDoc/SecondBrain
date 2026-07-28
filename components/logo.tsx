export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 6c-7 0-11 5-11 10-4 1-7 5-6 10-3 2-4 6-2 10-2 3-1 8 3 10 1 5 6 8 11 7 2 2 5 2 5 2V6z"
        fill="var(--brand-green)"
      />
      <path
        d="M32 6c7 0 11 5 11 10 4 1 7 5 6 10 3 2 4 6 2 10 2 3 1 8-3 10-1 5-6 8-11 7-2 2-5 2-5 2V6z"
        fill="var(--brand-blue)"
      />
      <g stroke="#f4f6fb" strokeWidth="2" fill="none">
        <line x1="32" y1="32" x2="20" y2="20" />
        <line x1="32" y1="32" x2="14" y2="30" />
        <line x1="32" y1="32" x2="18" y2="44" />
        <line x1="32" y1="32" x2="44" y2="20" />
        <line x1="32" y1="32" x2="50" y2="30" />
        <line x1="32" y1="32" x2="46" y2="44" />
      </g>
      <circle cx="32" cy="32" r="6" fill="#29abe2" stroke="#f4f6fb" strokeWidth="2" />
      <circle cx="20" cy="20" r="3.5" fill="#29abe2" stroke="#f4f6fb" strokeWidth="1.5" />
      <circle cx="14" cy="30" r="3.5" fill="#8dc63f" stroke="#f4f6fb" strokeWidth="1.5" />
      <circle cx="18" cy="44" r="3.5" fill="#29abe2" stroke="#f4f6fb" strokeWidth="1.5" />
      <circle cx="44" cy="20" r="3.5" fill="#8dc63f" stroke="#f4f6fb" strokeWidth="1.5" />
      <circle cx="50" cy="30" r="3.5" fill="#29abe2" stroke="#f4f6fb" strokeWidth="1.5" />
      <circle cx="46" cy="44" r="3.5" fill="#8dc63f" stroke="#f4f6fb" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark />
      <span className="text-lg font-bold leading-tight tracking-tight">
        Второй мозг
        <br />
        педиатра
      </span>
    </div>
  );
}
