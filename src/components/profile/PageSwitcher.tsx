"use client";

import clsx from "clsx";
import { Lock, Plus } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { PageDTO } from "@/lib/dto";
import { gsap, reducedMotion } from "@/lib/gsap";
import { Badge } from "@/components/ui/Badge";

/** Horizontally scrollable page pills; a single indicator glides between them. */
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
      if (animate && !reducedMotion()) gsap.to(indicator.current, { ...vars, duration: 0.25, ease: "power2.out", overwrite: true });
      else gsap.set(indicator.current, vars);
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, pages.length, pages]);

  return (
    <div className="py-2" data-testid="page-switcher">
      <div ref={track} role="tablist" aria-label="Pages" className="no-scrollbar relative flex items-center gap-1 overflow-x-auto">
        <span ref={indicator} aria-hidden className="absolute left-0 top-0 h-full rounded-full bg-foreground opacity-0 shadow-lg" />
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
                "relative z-10 flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-meta font-medium transition-colors",
                active ? "text-background" : "text-muted hover:text-foreground",
              )}
            >
              {p.title}
            </button>
          );
        })}
        {isOwner && (
          <button
            onClick={onCreate}
            data-testid="new-page"
            className="relative z-10 ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-medium text-muted transition hover:border-accent hover:text-foreground"
            aria-label={locked ? "New page (requires Plus)" : "New page"}
          >
            {locked ? (
              <Lock className="size-4" aria-hidden strokeWidth={2.2} />
            ) : (
              <Plus className="size-4" aria-hidden strokeWidth={2.4} />
            )}
            New page
            {locked && <Badge>Plus</Badge>}
          </button>
        )}
      </div>
    </div>
  );
}
