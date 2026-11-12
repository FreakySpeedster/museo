"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { timeAgo } from "@/lib/time";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ItemThumb } from "./ItemThumb";
import { VisibilityLock } from "@/components/ui/VisibilityLock";

interface Feed { items: TimelineEntry[]; nextCursor: string | null }

export function OwnerTimeline({ username, initial }: { username: string; initial: Feed }) {
  const [feed, setFeed] = useState<Feed>(initial);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  async function load(cursor?: string) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api<Feed>(`/api/users/${username}/timeline${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      setFeed((f) => (cursor ? { items: [...f.items, ...res.items.filter((n) => !f.items.some((p) => p.id === n.id))], nextCursor: res.nextCursor } : res));
    } catch (e) {
      if (!(e instanceof ApiError)) return;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && feed.nextCursor && !loadingRef.current) void load(feed.nextCursor);
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.nextCursor]);

  if (feed.items.length === 0 && !loading) {
    return <p className="py-16 text-center text-meta text-muted">Nothing in your timeline yet. Add an item to a shelf.</p>;
  }

  return (
    <div className="space-y-4">
      {feed.items.map((e) => {
        const hidden = e.visibility === "private" || e.shelf.visibility === "private" || e.page.visibility === "private";
        return (
          <Link key={e.id} href={`/i/${e.id}`} className="flex gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-3 hover:bg-surface-hover">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
              <ItemThumb item={e} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-meta font-semibold">
                <span className="truncate">{e.title}</span>
                {hidden && <VisibilityLock label="Private" />}
              </p>
              <p className="mt-1 flex items-center gap-1 text-caption text-muted">
                <CategoryIcon category={e.shelf.category} className="size-3.5" />
                <span className="truncate">{e.shelf.name}{e.page.title ? ` · ${e.page.title}` : ""}</span>
              </p>
              <p className="mt-1 text-caption text-muted">{timeAgo(e.createdAt)}</p>
            </div>
          </Link>
        );
      })}
      <div ref={sentinel} className="h-8" aria-hidden />
      {loading && <Skeleton className="h-24" />}
    </div>
  );
}
