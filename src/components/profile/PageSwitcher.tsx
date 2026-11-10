"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef } from "react";
import type { PageDTO } from "@/lib/dto";
import { gsap, reducedMotion } from "@/lib/gsap";

/** Sticky pill switcher; a single indicator glides between pills. */
export function PageSwitcher({
  pages,
  activeId,
  onSelect,
  isOwner,
  locked,
  onCreate,
}: {
  pages: PageDTO[];
  activeId: string;
  onSelect: (id: string) => void;
  isOwner: boolean;
  locked: boolean;
  onCreate: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const btn = track.current?.querySelector<HTMLElement>(`[data-page-id="${activeId}"]`);
      if (!btn || !indicator.current) return;
      const vars = { x: btn.offsetLeft, width: btn.offsetWidth, opacity: 1 };
      if (animate) btn.scrollIntoView?.({ inline: "center", block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
      if (animate && !reducedMotion()) gsap.to(indicator.current, { ...vars, duration: 0.55, ease: "elastic.out(1, 0.75)", overwrite: true });
      else gsap.set(indicator.current, vars);
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, pages.length, pages]);

  return (
    <div className="glass sticky top-16 z-30 -mx-4 border-b border-line/70 px-4 py-3 sm:-mx-6 sm:px-6" data-testid="page-switcher">
      <div ref={track} role="tablist" aria-label="Pages" className="no-scrollbar relative flex items-center gap-1 overflow-x-auto">
        <span ref={indicator} aria-hidden className="absolute left-0 top-0 h-full rounded-full bg-ink opacity-0 shadow-lg" />
        {pages.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={active}
              data-page-id={p.id}
              onClick={() => onSelect(p.id)}
              className={clsx(
                "relative z-10 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active ? "text-bg" : "text-muted hover:text-ink",
              )}
            >
              <span aria-hidden>{p.emoji}</span>
              {p.title}
            </button>
          );
        })}
        {isOwner && (
          <button
            onClick={onCreate}
            data-testid="new-page"
            className="relative z-10 ml-1 flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-ink"
            aria-label={locked ? "New page (requires Plus)" : "New page"}
          >
            {locked ? (
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            ) : (
              <span aria-hidden>＋</span>
            )}
            New page
            {locked && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold uppercase text-accent-ink">Plus</span>}
          </button>
        )}
      </div>
    </div>
  );
}
