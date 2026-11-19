"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_MS = 60_000;
export const READ_EVENT = "museo:notifications-read";

/** Unread notification count: seeded by the server, refreshed on navigation, focus and a slow poll while visible. */
export function useUnreadCount(initial: number) {
  const [count, setCount] = useState(initial);
  const path = usePathname();

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let ctrl: AbortController | null = null;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const res = await fetch("/api/notifications/count", { signal: ctrl.signal, cache: "no-store" });
        if (res.ok && alive) setCount((await res.json()).count ?? 0);
      } catch {
        /* offline or aborted: keep the last value */
      }
    };
    const schedule = () => {
      window.clearInterval(timer);
      timer = window.setInterval(load, POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
        schedule();
      } else window.clearInterval(timer);
    };
    const onRead = () => setCount(0);
    void load();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(READ_EVENT, onRead);
    return () => {
      alive = false;
      ctrl?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(READ_EVENT, onRead);
    };
  }, [path]);

  return count;
}
