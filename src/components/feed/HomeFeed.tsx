"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ItemDTO, ShelfDTO, TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { ArrowUpRight, MessageCircle, Sprout } from "lucide-react";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { ItemModal } from "@/components/profile/ItemModal";
import { LikeButton } from "@/components/social/LikeButton";

type Scope = "following" | "global";
interface Feed { items: TimelineEntry[]; nextCursor: string | null }

export function HomeFeed({
  initialScope,
  initial,
  hasFollows,
  viewerId,
}: {
  initialScope: Scope;
  initial: Feed;
  hasFollows: boolean;
  viewerId: string;
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [feed, setFeed] = useState<Feed>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<TimelineEntry | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const loadingRef = useRef(false);

  useGSAP(
    () => {
      if (reducedMotion() || !root.current) return;
      const ScrollTrigger = ensureScrollTrigger();
      const cards = gsap.utils.toArray<HTMLElement>("[data-feed-card]:not([data-seen])", root.current);
      cards.forEach((c) => c.setAttribute("data-seen", "1"));
      gsap.set(cards, { opacity: 0, y: 10 });
      ScrollTrigger.batch(cards, {
        start: "top 95%",
        once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.05 }),
      });
    },
    { scope: root, dependencies: [feed.items.length, scope] },
  );

  async function load(next: Scope, cursor?: string) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api<Feed>(`/api/feed?scope=${next}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      setFeed((f) => (cursor ? { items: [...f.items, ...res.items.filter((n) => !f.items.some((p) => p.id === n.id))], nextCursor: res.nextCursor } : res));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load the feed");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && feed.nextCursor && !loadingRef.current) {
        void load(scope, feed.nextCursor);
      }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.nextCursor, scope]);

  function switchScope(s: Scope) {
    if (s === scope) return;
    setScope(s);
    setFeed({ items: [], nextCursor: null });
    void load(s);
  }

  function patch(item: ItemDTO) {
    setFeed((f) => ({ ...f, items: f.items.map((e) => (e.id === item.id ? { ...e, ...item } : e)) }));
    setOpen((o) => (o && o.id === item.id ? { ...o, ...item } : o));
  }

  const openShelf: ShelfDTO | null = open
    ? { id: open.shelf.id, pageId: open.page.id, name: open.shelf.name, category: open.shelf.category, position: 0, visibility: open.shelf.visibility, items: [open] }
    : null;

  return (
    <div ref={root}>
      <Tabs
        label="Feed"
        className="mb-6"
        value={scope}
        onChange={switchScope}
        options={[
          { value: "following", label: "Following" },
          { value: "global", label: "Everyone" },
        ]}
      />

      {loading && feed.items.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
        </div>
      ) : feed.items.length === 0 ? (
        <EmptyState
          icon={<Sprout className="size-10" aria-hidden strokeWidth={1.6} />}
          title={scope === "following" && !hasFollows ? "Your feed is quiet" : "Nothing here yet"}
          description="Follow collectors to see what they add, or browse everyone’s latest finds."
          action={<Button variant="secondary" onClick={() => switchScope("global")}>Browse everyone</Button>}
        />
      ) : (
        <div className="space-y-5" data-testid="feed">
          {feed.items.map((e) => (
            <article key={e.id} data-feed-card className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <header className="flex items-center gap-3 px-4 pb-3 pt-4">
                <Link href={`/u/${e.user.username}`} className="shrink-0">
                  <Avatar name={e.user.displayName} username={e.user.username} avatarUrl={e.user.avatarUrl} size="sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-meta">
                    <Link href={`/u/${e.user.username}`} className="font-semibold hover:underline">{e.user.displayName}</Link>
                    <span className="text-muted"> · {timeAgo(e.createdAt)}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate text-caption text-muted">
                    <CategoryIcon category={e.shelf.category} className="size-3.5 shrink-0" />
                    <Link href={`/u/${e.user.username}?page=${e.page.id}`} className="hover:underline">{e.shelf.name}</Link>
                    {e.page.title && <span className="truncate"> · {e.page.title}</span>}
                  </p>
                </div>
              </header>
              <button type="button" className="block w-full text-left" onClick={() => setOpen(e)} aria-label={`Open ${e.title}`}>
                <div className="aspect-[16/10] overflow-hidden bg-surface-hover">
                  <ItemThumb item={e} />
                </div>
                <div className="space-y-2 px-4 pt-3">
                  <h3 className="text-heading font-semibold leading-snug">{e.title}</h3>
                  {e.description && <p className="whitespace-pre-line text-body text-foreground/90">{e.description}</p>}
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 px-3 py-3">
                <div className="flex items-center gap-1">
                  <LikeButton
                    itemId={e.id}
                    likeCount={e.likeCount}
                    likedByMe={e.likedByMe}
                    signedIn
                    onChange={(s) => patch({ ...e, ...s })}
                  />
                  <Link
                    href={`/i/${e.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    aria-label={`Comments, ${e.commentCount}`}
                  >
                    <MessageCircle className="size-4" aria-hidden strokeWidth={1.8} />
                    <span>{e.commentCount}</span>
                  </Link>
                </div>
                {e.url && (
                  <a href={e.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 px-2 text-caption font-medium text-muted hover:text-foreground">
                    {e.siteName ?? "Visit"} <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                )}
              </div>
              {(e.previewComments?.length ?? 0) > 0 && (
                <ul className="space-y-1.5 px-4 pb-2">
                  {e.previewComments.map((c) => (
                    <li key={c.id} className="text-caption leading-snug">
                      <Link href={`/u/${c.user.username}`} className="font-semibold hover:underline">{c.user.displayName}</Link>{" "}
                      <span className="whitespace-pre-line text-foreground/90">{c.body}</span>
                    </li>
                  ))}
                </ul>
              )}
              {e.commentCount > 2 && (
                <Link href={`/i/${e.id}`} className="block px-4 pb-4 text-caption text-muted hover:underline">
                  View all {e.commentCount} comments
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
      <div ref={sentinel} className="h-8" aria-hidden />
      {loading && feed.items.length > 0 && <p className="py-4 text-center text-caption text-muted">Loading more…</p>}
      <ItemModal
        item={open}
        shelf={openShelf}
        isOwner={open?.user.id === viewerId}
        viewerId={viewerId}
        onClose={() => setOpen(null)}
        onUpdated={patch}
        onDeleted={(it) => {
          setFeed((f) => ({ ...f, items: f.items.filter((e) => e.id !== it.id) }));
          setOpen(null);
        }}
      />
    </div>
  );
}
