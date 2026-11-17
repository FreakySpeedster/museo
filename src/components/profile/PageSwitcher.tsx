"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, Lock, Plus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { PageDTO } from "@/lib/dto";
import { gsap, reducedMotion } from "@/lib/gsap";
import { Badge } from "@/components/ui/Badge";
import { VisibilityLock } from "@/components/ui/VisibilityLock";

/** Horizontally scrollable page pills; a single indicator glides between them. */
export function PageSwitcher({
  pages,
  activeId,
  onSelect,
  isOwner,
  locked,
  onCreate,
  onReorder,
}: {
  pages: PageDTO[];
  activeId: string;
  onSelect: (id: string) => void;
  isOwner: boolean;
  locked: boolean;
  onCreate: () => void;
  onReorder?: (pageIds: string[]) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const [reordering, setReordering] = useState(false);

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const btn = track.current?.querySelector<HTMLElement>(`[data-page-id="${activeId}"]`);
      if (!btn || !indicator.current) return;
      const vars = { x: btn.offsetLeft, width: btn.offsetWidth, opacity: reordering ? 0 : 1 };
      if (animate) btn.scrollIntoView?.({ inline: "center", block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
      if (animate && !reducedMotion()) gsap.to(indicator.current, { ...vars, duration: 0.25, ease: "power2.out", overwrite: true });
      else gsap.set(indicator.current, vars);
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, pages.length, pages, reordering]);

  function move(id: string, dir: -1 | 1) {
    const i = pages.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder?.(next.map((p) => p.id));
  }

  return (
    <div className="py-2" data-testid="page-switcher">
      <div ref={track} role="tablist" aria-label="Pages" className="no-scrollbar relative flex items-center gap-1 overflow-x-auto">
        <span ref={indicator} aria-hidden className="absolute left-0 top-0 h-full rounded-full bg-foreground opacity-0 shadow-lg" />
        {pages.map((p, i) => {
          const active = p.id === activeId;
          return (
            <div key={p.id} className="flex shrink-0 items-center gap-0.5">
              {reordering && isOwner && (
                <button
                  type="button"
                  data-hit="compact"
                  className="relative z-10 grid size-8 place-items-center rounded-full text-muted hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${p.title} earlier`}
                  disabled={i === 0}
                  onClick={() => move(p.id, -1)}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              )}
              <button
                role="tab"
                aria-selected={active}
                data-page-id={p.id}
                onClick={() => onSelect(p.id)}
                className={clsx(
                  "relative z-10 flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-meta font-medium transition-colors",
                  active && !reordering ? "text-background" : "text-muted hover:text-foreground",
                  reordering && "border border-border bg-surface text-foreground",
                )}
              >
                {p.title}
                {isOwner && p.visibility === "private" && <VisibilityLock label="Private page" />}
              </button>
              {reordering && isOwner && (
                <button
                  type="button"
                  data-hit="compact"
                  className="relative z-10 grid size-8 place-items-center rounded-full text-muted hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${p.title} later`}
                  disabled={i === pages.length - 1}
                  onClick={() => move(p.id, 1)}
                >
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          );
        })}
        {isOwner && !reordering && (
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
        {isOwner && pages.length > 1 && onReorder && (
          <button
            type="button"
            onClick={() => setReordering((v) => !v)}
            className="relative z-10 ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-meta font-medium text-muted hover:text-foreground"
          >
            {reordering ? <><Check className="size-4" aria-hidden /> Done</> : "Reorder pages"}
          </button>
        )}
      </div>
    </div>
  );
}
