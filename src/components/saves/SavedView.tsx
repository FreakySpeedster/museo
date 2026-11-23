"use client";

import clsx from "clsx";
import Link from "next/link";
import { Compass, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SavedEntry } from "@/lib/services/saves";
import { ApiError, api } from "@/lib/client";
import { categoryMeta } from "@/lib/categories";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { UserName } from "@/components/ui/UserName";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { SaveButton } from "./SaveButton";

interface Page { items: SavedEntry[]; nextCursor: string | null }

/**
 * The Want list grid. Removing keeps the tile in place (dimmed) until you leave, so a mis-tap is one tap to undo.
 */
export function SavedView({ initial }: { initial: Page }) {
  const [page, setPage] = useState<Page>(initial);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  async function more() {
    if (busy.current || !page.nextCursor) return;
    busy.current = true;
    setLoading(true);
    setFailed(null);
    try {
      const r = await api<Page>(`/api/me/saved?cursor=${encodeURIComponent(page.nextCursor)}`);
      setPage((p) => ({ items: [...p.items, ...r.items.filter((n) => !p.items.some((o) => o.id === n.id))], nextCursor: r.nextCursor }));
    } catch (e) {
      setFailed(e instanceof ApiError ? e.message : "Couldn't load more");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !page.nextCursor || failed) return;
    const io = new IntersectionObserver((es) => es[0]?.isIntersecting && void more(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.nextCursor, failed]);

  if (page.items.length === 0) {
    return (
      <EmptyState
        icon={<Star aria-hidden />}
        title="Nothing saved yet"
        description="Tap the star on anything you’d love to own. It lands here, and only you can see it."
        action={<LinkButton href="/?tab=explore" variant="secondary"><Compass className="size-4" aria-hidden /> Explore</LinkButton>}
      />
    );
  }

  return (
    <div data-testid="saved-grid">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
        {page.items.map((it, i) => {
          const gone = removed.has(it.id);
          return (
            <li key={it.id} className={clsx("min-w-0 transition-opacity duration-200", gone && "opacity-50")} data-testid="saved-tile">
              <div className="relative">
                <Link href={`/i/${it.id}`} className="group block overflow-hidden rounded-2xl" aria-label={it.title}>
                  <div className="aspect-square">
                    <ItemThumb item={it} hint={{ category: it.shelf.category, collection: it.shelf.name }} eager={i < 4} className="transition-transform duration-300 group-hover:scale-[1.03]" />
                  </div>
                </Link>
                <SaveButton
                  itemId={it.id}
                  savedByMe={!gone}
                  signedIn
                  variant="overlay"
                  className="absolute right-1 top-1"
                  onChange={(saved) =>
                    setRemoved((s) => {
                      const n = new Set(s);
                      if (saved) n.delete(it.id);
                      else n.add(it.id);
                      return n;
                    })
                  }
                />
                {gone && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-micro font-semibold text-white backdrop-blur">Removed</span>}
              </div>
              <Link href={`/i/${it.id}`} className="mt-2 line-clamp-2 block text-meta font-semibold leading-snug">{it.title}</Link>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-caption text-muted">
                <UserName user={it.user} label="username" size="sm" className="min-w-0" nameClassName="text-caption" />
                <span aria-hidden>·</span>
                <span className="truncate">{categoryMeta(it.shelf.category).label}</span>
              </div>
            </li>
          );
        })}
        {loading &&
          Array.from({ length: 2 }, (_, i) => (
            <li key={`s${i}`} aria-hidden>
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
            </li>
          ))}
      </ul>
      {failed && (
        <p className="py-6 text-center text-meta text-muted">
          {failed}.{" "}
          <button type="button" className="min-h-11 font-semibold text-foreground underline underline-offset-4" onClick={() => void more()}>Try again</button>
        </p>
      )}
      <div ref={sentinel} className="h-8" aria-hidden />
    </div>
  );
}
