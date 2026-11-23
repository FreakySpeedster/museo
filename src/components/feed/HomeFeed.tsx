"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineEntry } from "@/lib/dto";
import type { ExploreChip } from "@/lib/services/explore";
import { ApiError, api } from "@/lib/client";
import { ArrowUp, Sprout } from "lucide-react";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { FeedSkeleton } from "./FeedSkeleton";
import { FeedPost } from "./FeedPost";
import { ExploreView } from "@/components/explore/ExploreView";
import { PeopleSuggestions } from "@/components/discover/DiscoverRail";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Scope = "following" | "explore";
interface Feed { items: TimelineEntry[]; nextCursor: string | null }

export function HomeFeed({
  initialScope,
  initial,
  hasFollows,
  viewerId,
  chips,
}: {
  initialScope: Scope;
  initial: Feed;
  hasFollows: boolean;
  viewerId: string;
  chips: ExploreChip[];
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [feed, setFeed] = useState<Feed>(initial);
  const [loading, setLoading] = useState(false);
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
    if (next === "explore" || loadingRef.current) return;
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

  // "New posts" pill: poll quietly and count entries newer than the top of the feed.
  const [fresh, setFresh] = useState(0);
  const top = feed.items[0]?.id;
  useEffect(() => {
    if (!top || scope !== "following") return;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await api<Feed>(`/api/feed?scope=${scope}`);
        const i = res.items.findIndex((x) => x.id === top);
        setFresh(i === -1 ? res.items.length : i);
      } catch {
        /* offline: try again next tick */
      }
    };
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, [scope, top]);

  async function refresh() {
    setFresh(0);
    await load(scope);
  }

  function switchScope(s: Scope) {
    if (s === scope) return;
    setScope(s);
    const url = new URL(window.location.href);
    if (s === "explore") url.searchParams.set("tab", "explore");
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url);
    if (s === "following" && feed.items.length === 0) void load(s);
  }

  function patch(item: TimelineEntry) {
    setFeed((f) => ({ ...f, items: f.items.map((e) => (e.id === item.id ? { ...e, ...item } : e)) }));
  }

  return (
    <div ref={root}>
      {scope === "following" && <PullToRefresh onRefresh={() => refresh()} />}
      {fresh > 0 && scope === "following" && (
        <div className="pointer-events-none sticky top-[calc(var(--chrome-top)+3.5rem)] z-30 -mb-10 flex h-10 justify-center">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
              void refresh();
            }}
            data-testid="new-posts"
            className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-meta font-semibold text-background shadow-lg transition-transform active:scale-95"
          >
            <ArrowUp className="size-4" aria-hidden /> {fresh > 9 ? "9+" : fresh} new {fresh === 1 ? "post" : "posts"}
          </button>
        </div>
      )}
      <Tabs
        label="Feed"
        sticky
        className="-mx-4 mb-4 sm:-mx-6"
        value={scope}
        onChange={switchScope}
        options={[
          { value: "following", label: "Following" },
          { value: "explore", label: "Explore" },
        ]}
      />

      {scope === "explore" ? (
        <ExploreView chips={chips} stickyTop="top-[calc(var(--chrome-top)+3rem)]" signedIn />
      ) : loading && feed.items.length === 0 ? (
        <FeedSkeleton />
      ) : feed.items.length === 0 ? (
        <>
          <EmptyState
            icon={<Sprout aria-hidden />}
            title={hasFollows ? "Nothing new yet" : "Your feed is quiet"}
            description="Follow collectors to see what they add here, or explore what people are collecting."
            action={<Button variant="secondary" onClick={() => switchScope("explore")}>Explore</Button>}
          />
          <PeopleSuggestions signedIn className="mt-2" />
        </>
      ) : (
        <div data-testid="feed">
          {feed.items.map((e, i) => (
            <FeedPost key={e.id} entry={e} viewerId={viewerId} eager={i < 2} onPatch={patch} />
          ))}
        </div>
      )}
      {scope === "following" && <div ref={sentinel} className="h-8" aria-hidden />}
      {scope === "following" && loading && feed.items.length > 0 && <p className="py-4 text-center text-caption text-muted">Loading more…</p>}
    </div>
  );
}
