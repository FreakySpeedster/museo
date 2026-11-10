"use client";

import { useMemo, useRef, useState } from "react";
import type { TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { categoryMeta } from "@/lib/categories";
import { ScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { dayLabel, timeAgo } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ItemThumb } from "./ItemThumb";

export function TimelineList({
  entries,
  setEntries,
  nextCursor,
  setNextCursor,
  username,
  onOpen,
  emptyOwner,
}: {
  entries: TimelineEntry[];
  setEntries: (fn: (prev: TimelineEntry[]) => TimelineEntry[]) => void;
  nextCursor: string | null;
  setNextCursor: (c: string | null) => void;
  username: string;
  onOpen: (e: TimelineEntry) => void;
  emptyOwner: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: TimelineEntry[] }> = [];
    for (const e of entries) {
      const label = dayLabel(e.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [entries]);

  useGSAP(
    () => {
      if (reducedMotion() || !root.current) return;
      const fresh = gsap.utils.toArray<HTMLElement>("[data-entry]:not([data-seen])", root.current);
      fresh.forEach((el, i) => {
        el.setAttribute("data-seen", "1");
        gsap.from(el, {
          opacity: 0,
          y: 40,
          x: i % 2 ? 24 : -24,
          duration: 0.7,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-day]:not([data-seen])", root.current).forEach((el) => {
        el.setAttribute("data-seen", "1");
        gsap.from(el, { opacity: 0, scale: 0.8, transformOrigin: "left center", duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: el, start: "top 94%", once: true } });
      });
      if (!root.current.dataset.line) {
        root.current.dataset.line = "1";
        gsap.fromTo(
          "[data-line]",
          { scaleY: 0 },
          { scaleY: 1, transformOrigin: "top center", ease: "none", scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 70%", scrub: 0.6 } },
        );
      }
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [entries.length] },
  );

  async function more() {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const res = await api<{ items: TimelineEntry[]; nextCursor: string | null }>(`/api/users/${username}/timeline?cursor=${encodeURIComponent(nextCursor)}`);
      setEntries((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setNextCursor(res.nextCursor);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load more");
    } finally {
      setLoading(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="grid place-items-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <div className="text-4xl">🕰️</div>
        <p className="mt-3 text-lg font-semibold">Nothing on the timeline yet</p>
        <p className="text-sm text-muted">{emptyOwner ? "Everything you add to a shelf shows up here, newest first." : "When they add items, they’ll appear here."}</p>
      </div>
    );
  }

  return (
    <div ref={root} className="relative pl-6 sm:pl-10" data-testid="timeline">
      <div className="absolute bottom-0 left-[7px] top-2 w-0.5 bg-line sm:left-[15px]" aria-hidden />
      <div data-line className="absolute bottom-0 left-[7px] top-2 w-0.5 bg-gradient-to-b from-accent to-amber-400 sm:left-[15px]" aria-hidden />
      <ol className="space-y-8">
        {groups.map((g) => (
          <li key={g.label}>
            <div data-day className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-card">
              <span className="absolute -left-[26px] top-1/2 size-3.5 -translate-y-1/2 rounded-full border-[3px] border-bg bg-accent sm:-left-[34px] sm:size-4" aria-hidden />
              {g.label}
            </div>
            <ul className="space-y-4">
              {g.items.map((e) => {
                const meta = categoryMeta(e.shelf.category);
                return (
                  <li key={e.id} data-entry data-testid="timeline-entry">
                    <button
                      onClick={() => onOpen(e)}
                      className="group flex w-full gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-accent/50 sm:p-4"
                    >
                      <div className="size-24 shrink-0 overflow-hidden rounded-xl sm:size-28">
                        <div className="h-full w-full transition duration-500 group-hover:scale-110"><ItemThumb item={e} /></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          Added to <span className="font-medium text-ink">{meta.emoji} {e.shelf.name}</span> · {timeAgo(e.createdAt)}
                        </p>
                        <h4 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{e.title}</h4>
                        {e.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{e.description}</p>}
                        <p className="mt-2 text-xs text-muted">
                          {e.type === "LINK" ? `🔗 ${e.siteName ?? "Link"}` : "🖼️ Photo"} · on <span className="font-medium">{e.page.emoji} {e.page.title}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {loading && (
        <div className="mt-6 space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
      )}
      {nextCursor && !loading && (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={more}>Load older items</Button>
        </div>
      )}
    </div>
  );
}
