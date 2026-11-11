import Link from "next/link";

/** Official nook mark: thick rounded house/alcove, open at the bottom-right, plus a fixed brown dot. */
export const NOOK_DOT = "#875F44";

const HOUSE_PATH =
  "M682 996H298A298 298 0 0 1 0 698V298A298 298 0 0 1 298 0H726A298 298 0 0 1 1024 298V652A98 98 0 0 1 828 652V298A102 102 0 0 0 726 196H298A102 102 0 0 0 200 298V698A102 102 0 0 0 298 800H682A98 98 0 0 1 682 996Z";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="-24 -24 1072 1044" className={className} aria-hidden>
      <path d={HOUSE_PATH} fill="currentColor" />
      <circle cx="926" cy="898" r="98" fill={NOOK_DOT} />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="nook home">
      <LogoMark />
      <span className="text-heading">nook</span>
    </Link>
  );
}
