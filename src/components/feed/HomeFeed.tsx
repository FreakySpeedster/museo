"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRef, useState } from "react";
import type { TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { categoryMeta } from "@/lib/categories";
import { gsap, reducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Tilt } from "@/components/motion/Tilt";
import { ItemThumb } from "@/components/profile/ItemThumb";

type Scope = "following" | "global";
interface Feed { items: TimelineEntry[]; nextCursor: string | null }

export function HomeFeed({ initialScope, initial, hasFollows }: { initialScope: Scope; initial: Feed; hasFollows: boolean }) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [feed, setFeed] = useState<Feed>(initial);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useGSAP(
    () => {
      if (reducedMotion() || !root.current) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-feed-card]:not([data-seen])", root.current);
      cards.forEach((c) => c.setAttribute("data-seen", "1"));
      gsap.set(cards, { opacity: 0, y: 40 });
      ScrollTrigger.batch(cards, {
        start: "top 95%",
        once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.07 }),
      });
    },
    { scope: root, dependencies: [feed.items.length, scope] },
  );

  async function load(next: Scope, cursor?: string) {
    setLoading(true);
    try {
      const res = await api<Feed>(`/api/feed?scope=${next}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      setFeed((f) => (cursor ? { items: [...f.items, ...res.items.filter((n) => !f.items.some((p) => p.id === n.id))], nextCursor: res.nextCursor } : res));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load the feed");
    } finally {
      setLoading(false);
    }
  }

  function switchScope(s: Scope) {
    if (s === scope) return;
    setScope(s);
    setFeed({ items: [], nextCursor: null });
    void load(s);
  }

  return (
    <div ref={root}>
      <div role="tablist" aria-label="Feed" className="mb-6 inline-flex rounded-full border border-line bg-surface p-1">
        {(["following", "global"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => switchScope(s)}
            className={clsx("rounded-full px-5 py-1.5 text-sm font-medium transition", scope === s ? "bg-ink text-bg shadow" : "text-muted hover:text-ink")}
          >
            {s === "following" ? "Following" : "Everyone"}
          </button>
        ))}
      </div>

      {loading && feed.items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : feed.items.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
          <div className="text-4xl">🌱</div>
          <p className="mt-3 text-lg font-semibold">{scope === "following" && !hasFollows ? "Your feed is quiet" : "Nothing here yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Follow collectors to see what they add, or browse everyone’s latest finds.</p>
          <Button className="mt-4" variant="secondary" onClick={() => switchScope("global")}>Browse everyone</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="feed">
          {feed.items.map((e) => {
            const meta = categoryMeta(e.shelf.category);
            return (
              <article key={e.id} data-feed-card className="relative">
                <Tilt className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card" max={5}>
                  <Link href={`/u/${e.user.username}?page=${e.page.id}`} className="block" aria-label={`${e.title} by ${e.user.displayName}`}>
                    <div className="aspect-[16/10] overflow-hidden"><ItemThumb item={e} /></div>
                  </Link>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Avatar name={e.user.displayName} username={e.user.username} size={22} />
                      <Link href={`/u/${e.user.username}`} className="font-medium text-ink hover:underline">{e.user.displayName}</Link>
                      <span>·</span><span>{timeAgo(e.createdAt)}</span>
                    </div>
                    <h3 className="line-clamp-2 font-semibold leading-snug">{e.title}</h3>
                    {e.description && <p className="line-clamp-2 text-sm text-muted">{e.description}</p>}
                    <div className="flex items-center justify-between pt-1 text-xs text-muted">
                      <span className="rounded-full bg-surface-2 px-2.5 py-1">{meta.emoji} {e.shelf.name}</span>
                      {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-accent hover:underline">{e.siteName ?? "Visit"} ↗</a>}
                    </div>
                  </div>
                </Tilt>
              </article>
            );
          })}
        </div>
      )}
      {feed.nextCursor && (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" loading={loading} onClick={() => load(scope, feed.nextCursor!)}>Load more</Button>
        </div>
      )}
    </div>
  );
}
