import Link from "next/link";
import clsx from "clsx";

/** Official nook mark. House follows currentColor; the brown dot is fixed in both themes. */
export const NOOK_DOT = "#855E42";

const HOUSE_PATH =
  "M21 286.246C9.40187 286.246 0 276.844 0 265.246V93.746C0 86.2437 4.00225 79.3111 10.5 75.5591L136.5 2.81334C142.998 -0.937781 151.002 -0.937781 157.5 2.81334L283.5 75.5591C289.998 79.3111 294 86.2437 294 93.746V215.246H245V109.912L147 53.3315L49 109.912V237.246H224V286.246H21Z";

const DOT_PATH =
  "M266 286C281.464 286 294 273.464 294 258C294 242.536 281.464 230 266 230C250.536 230 238 242.536 238 258C238 273.464 250.536 286 266 286Z";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 294 287" className={className} aria-hidden fill="none">
      <path d={HOUSE_PATH} fill="currentColor" />
      <path d={DOT_PATH} fill={NOOK_DOT} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={clsx("font-wordmark", className)}>nook</span>;
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="nook home">
      <LogoMark />
      <Wordmark className="text-heading" />
    </Link>
  );
}
