"use client";

import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "./IconButton";

let inAppNavigations = 0;

/** Counts client-side route changes so Back knows whether there is an in-app page to return to. Render once in the root layout. */
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    inAppNavigations++;
  }, [path]);
  return null;
}

/** Back to the previous in-app screen, or to `fallback` after a deep link / new tab. */
export function useBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (inAppNavigations > 1) router.back();
    else router.push(fallback);
  };
}

/**
 * Sticky phone header for pushed screens. Its presence hides the app top bar and tab bar on phones (see globals.css).
 * Pushed screens: back on the left, a truncated title, actions on the right.
 * `left` replaces the back button (e.g. a Cancel text button in the composer). Hidden from md up.
 */
export function PhoneHeader({
  title,
  backHref,
  left,
  right,
  className,
}: {
  title?: ReactNode;
  backHref: string;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const back = useBack(backHref);
  return (
    <header
      data-testid="phone-header"
      data-pushed-screen
      className={clsx(
        "glass sticky top-0 z-nav -mx-4 mb-2 grid grid-cols-[minmax(2.75rem,auto)_1fr_minmax(2.75rem,auto)] items-center gap-1 border-b border-border/70 px-2 pt-[env(safe-area-inset-top)] sm:-mx-6 md:hidden",
        className,
      )}
    >
      <div className="flex h-14 items-center">
        {left ?? (
          <IconButton label="Back" onClick={back} className="size-11 text-foreground">
            <ArrowLeft className="size-6" aria-hidden strokeWidth={1.9} />
          </IconButton>
        )}
      </div>
      <div className="min-w-0 truncate text-center text-body font-semibold">{title}</div>
      <div className="flex h-14 items-center justify-end">{right}</div>
    </header>
  );
}
