"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TRIGGER = 72;

/**
 * Touch pull-to-refresh for the top of a page: drag down while scrolled to the very top,
 * release past the threshold to run `onRefresh`. Renders only the indicator; mouse users never see it.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const cb = useRef(onRefresh);
  useEffect(() => {
    cb.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && !document.body.dataset.modal ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0) return setPull((pullRef.current = 0));
      setPull((pullRef.current = Math.min(120, dy * 0.5)));
    };
    const up = async () => {
      const p = pullRef.current;
      start.current = null;
      setPull((pullRef.current = 0));
      if (p >= TRIGGER) {
        setBusy(true);
        try {
          await cb.current();
        } finally {
          setBusy(false);
        }
      }
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const shown = busy ? TRIGGER * 0.6 : pull;
  if (!shown) return null;
  return (
    <div aria-live="polite" className="pointer-events-none flex justify-center overflow-hidden transition-[height]" style={{ height: shown }} data-testid="pull-to-refresh">
      <span className="mt-2 grid size-9 place-items-center rounded-full border border-border bg-surface-raised shadow-sm">
        <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / TRIGGER) }} aria-hidden />
        <span className="sr-only">{busy ? "Refreshing" : pull >= TRIGGER ? "Release to refresh" : "Pull to refresh"}</span>
      </span>
    </div>
  );
}
