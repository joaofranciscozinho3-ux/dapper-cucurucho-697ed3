export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#ff5b26" stroke="#13231f" strokeWidth="4" />
        <path d="M18 33.5 27.5 43 47 22" fill="none" stroke="#13231f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      elaine
    </span>
  )
}
