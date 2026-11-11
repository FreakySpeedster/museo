import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect x="6" y="8" width="5" height="12" rx="1.2" fill="var(--accent-contrast)" />
      <rect x="13" y="5" width="5" height="15" rx="1.2" fill="var(--accent-contrast)" opacity=".85" />
      <rect x="20" y="10" width="6" height="10" rx="1.2" fill="var(--accent-contrast)" opacity=".7" />
      <rect x="4" y="22" width="24" height="3.5" rx="1.5" fill="#000" opacity=".35" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Shelfie home">
      <LogoMark />
      <span className="text-heading">Shelfie</span>
    </Link>
  );
}
