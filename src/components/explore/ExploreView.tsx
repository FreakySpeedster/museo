"use client";

import clsx from "clsx";
import { BookmarkCheck, Compass, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ExploreCard, ExploreChip } from "@/lib/services/explore";
import { ApiError, api } from "@/lib/client";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { OwnersStack } from "./OwnersStack";

interface Page { items: ExploreCard[]; nextOffset: number | null; personal: boolean; fallback: boolean }

/** Grid tiles keep their photo's shape too, within 3:4 .. 4:3, which gives the masonry its rhythm. */
const tileRatio = (w: number | null, h: number | null) => (w && h ? Math.min(4 / 3, Math.max(3 / 4, w / h)) : 1);

/**
 * Explore: item-focused discovery, not a post feed. Category chips across the top ("For you" first),
 * then a masonry of things people collect, ranked by how many own them.
 */
export function ExploreView({ chips, initial, stickyTop = "top-[var(--chrome-top)]" }: { chips: ExploreChip[]; initial?: Page; stickyTop?: string }) {
  const [chip, setChip] = useState(chips[0]?.id ?? "trending");
  const [page, setPage] = useState<Page | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const toast = useToast();

  async function load(c: string, offset = 0) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const r = await api<Page>(`/api/explore?chip=${encodeURIComponent(c)}&offset=${offset}`);
      setPage((p) => (offset && p ? { ...r, items: [...p.items, ...r.items.filter((n) => !p.items.some((o) => o.key === n.key))] } : r));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load Explore");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial) return;
    const t = window.setTimeout(() => void load(chip), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || page?.nextOffset == null) return;
    const io = new IntersectionObserver((es) => es[0]?.isIntersecting && page.nextOffset != null && void load(chip, page.nextOffset), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.nextOffset, chip]);

  function pick(c: string) {
    if (c === chip) return;
    setChip(c);
    setPage(null);
    void load(c);
  }

  return (
    <div data-testid="explore">
      <div className={clsx("glass sticky z-20 -mx-4 border-b border-border/60 sm:-mx-6", stickyTop)}>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6" role="tablist" aria-label="Explore categories" style={{ scrollbarWidth: "none" }}>
          {chips.map((c) => {
            const active = c.id === chip;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pick(c.id)}
                data-testid={`chip-${c.id}`}
                className={clsx(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-meta font-medium transition-colors",
                  active ? "bg-foreground text-background" : "bg-surface-hover text-foreground hover:bg-border/60",
                )}
              >
                {c.id === "for-you" ? <Sparkles className="size-4" aria-hidden /> : c.id === "trending" ? <TrendingUp className="size-4" aria-hidden /> : <CategoryIcon category={c.id} className="size-4" />}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {page?.fallback && page.items.length > 0 && (
        <p className="mt-4 text-meta text-muted">Not much in your categories yet, so here’s what’s trending everywhere.</p>
      )}

      {!page && loading ? (
        <ExploreGridSkeleton />
      ) : page && page.items.length === 0 ? (
        <EmptyState icon={<Compass aria-hidden />} title="Nothing trending here yet" description="When more people collect in this category, the most-owned things show up here." />
      ) : (
        <div className="mt-4 columns-2 gap-3 md:columns-3" data-testid="explore-grid">
          {page?.items.map((c, i) => <Tile key={c.key} card={c} eager={i < 4} />)}
        </div>
      )}
      <div ref={sentinel} className="h-8" aria-hidden />
      {loading && page && page.items.length > 0 && <p className="py-4 text-center text-caption text-muted">Loading more…</p>}
    </div>
  );
}

function Tile({ card, eager }: { card: ExploreCard; eager?: boolean }) {
  return (
    <Link href={`/explore/item/${card.key}`} className="group mb-4 block break-inside-avoid" data-testid="explore-tile">
      <div className="relative overflow-hidden rounded-2xl bg-surface-hover" style={{ aspectRatio: String(tileRatio(card.imageWidth, card.imageHeight)) }}>
        <ItemThumb item={{ id: card.itemId, imageUrl: card.imageUrl, faviconUrl: card.faviconUrl, title: card.title, siteName: card.siteName, type: card.type }} eager={eager} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {card.mine && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-micro font-semibold text-white backdrop-blur" title="In your collection">
            <BookmarkCheck className="size-3.5" aria-hidden /> Yours
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-meta font-semibold leading-snug">{card.title}</p>
      <OwnersStack users={card.ownerPreview} total={card.owners} size={18} className="mt-1 text-caption text-muted" />
    </Link>
  );
}

export function ExploreGridSkeleton() {
  const heights = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]", "aspect-[3/4]", "aspect-square", "aspect-[4/3]"];
  return (
    <div className="mt-4 columns-2 gap-3 md:columns-3" aria-hidden>
      {heights.map((h, i) => (
        <div key={i} className="mb-4 break-inside-avoid">
          <Skeleton className={clsx("w-full rounded-2xl", h)} />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
          <Skeleton className="mt-1.5 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
