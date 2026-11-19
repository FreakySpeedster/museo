"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/Button";

/** Phone-only "Get Plus" bar that appears once the Plus card's own button scrolls out of view; taps forward to it. */
export function StickyUpgrade({ targetId, price }: { targetId: string; price: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { rootMargin: "-72px 0px -140px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-[var(--tabbar-space)] z-30 px-4 pb-2 transition-[opacity,transform] duration-200 md:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <div className="glass-bar mx-auto flex max-w-md items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-meta"><span className="font-semibold">Museo Plus</span> <span className="text-muted">· {price}</span></span>
        <Button tabIndex={show ? 0 : -1} onClick={() => document.getElementById(targetId)?.querySelector<HTMLElement>("button, a")?.click()}>Get Plus</Button>
      </div>
    </div>
  );
}
