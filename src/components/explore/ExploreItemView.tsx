"use client";

import { ArrowUpRight, BookmarkCheck, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicUser, TimelineEntry } from "@/lib/dto";
import type { ExploreCard } from "@/lib/services/explore";
import { ApiError, api } from "@/lib/client";
import { categoryMeta } from "@/lib/categories";
import { plural } from "@/lib/plural";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PhoneHeader } from "@/components/ui/PushedScreen";
import { useToast } from "@/components/ui/Toast";
import { CollectButton } from "@/components/collect/CollectButton";
import { FeedPost } from "@/components/feed/FeedPost";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { PostMedia } from "@/components/feed/PostMedia";
import { OwnersStack } from "./OwnersStack";

type Hero = ExploreCard & { collected: Array<{ shelfId: string; shelfName: string }>; ownerPreview: PublicUser[] };
interface Posts { items: TimelineEntry[]; nextOffset: number | null }

/** One thing, everyone who has it: a hero with the owner count and "Add to my collection", then every owner's post. */
export function ExploreItemView({ hero, initial, viewerId }: { hero: Hero; initial: Posts; viewerId: string | null }) {
  const [posts, setPosts] = useState<Posts>(initial);
  const [collected, setCollected] = useState(hero.collected);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const toast = useToast();
  const rep = posts.items.find((p) => p.id === hero.itemId) ?? posts.items[0];
  const url = rep?.url ?? null;
  const ownItem = Boolean(viewerId && rep && rep.user.id === viewerId);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || posts.nextOffset == null) return;
    const io = new IntersectionObserver(async (es) => {
      if (!es[0]?.isIntersecting || busy.current || posts.nextOffset == null) return;
      busy.current = true;
      setLoading(true);
      try {
        const r = await api<Posts>(`/api/explore/item/${hero.key}?offset=${posts.nextOffset}`);
        setPosts((p) => ({ items: [...p.items, ...r.items.filter((n) => !p.items.some((o) => o.id === n.id))], nextOffset: r.nextOffset }));
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't load more posts");
      } finally {
        busy.current = false;
        setLoading(false);
      }
    }, { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [posts.nextOffset, hero.key, toast]);

  const patch = (e: TimelineEntry) => setPosts((p) => ({ ...p, items: p.items.map((x) => (x.id === e.id ? e : x)) }));
  const mine = collected.length > 0 || ownItem;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6" data-testid="explore-item">
      <PhoneHeader title={hero.title} backHref="/?tab=explore" />
      <section className="pt-2 md:pt-12">
        <div className="mx-auto w-full max-w-md">
          <PostMedia
            item={{ id: hero.itemId, title: hero.title, imageUrl: hero.imageUrl, images: [], faviconUrl: hero.faviconUrl, siteName: hero.siteName, type: hero.type, imageWidth: hero.imageWidth, imageHeight: hero.imageHeight }}
            hint={{ category: hero.category }}
            eager
            className="rounded-3xl shadow-lg"
          />
        </div>
        <div className="mt-5 text-center">
          <p className="inline-flex items-center gap-1.5 text-caption font-medium uppercase tracking-wide text-muted">
            <CategoryIcon category={hero.category} className="size-4" /> {categoryMeta(hero.category).label}
          </p>
          <h1 className="mt-1 text-balance text-title font-semibold leading-tight tracking-tight">{hero.title}</h1>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-1 inline-flex items-center gap-1 text-meta text-muted hover:text-foreground">
              {hero.siteName ?? "Visit link"} <ArrowUpRight className="size-4" aria-hidden />
            </a>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-meta text-muted">
            <OwnersStack users={hero.ownerPreview} total={hero.owners} size={24} long />
            {hero.likes > 0 && (
              <span className="inline-flex items-center gap-1"><Heart className="size-4" aria-hidden /> {hero.likes.toLocaleString("en-US")} {plural("like", hero.likes)}</span>
            )}
          </div>
          <div className="mt-5 flex justify-center">
            {ownItem ? (
              <span className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-meta font-semibold"><BookmarkCheck className="size-5" aria-hidden /> In your collection</span>
            ) : rep ? (
              <CollectButton itemId={rep.id} ownerId={rep.user.id} viewerId={viewerId} collected={collected} onChange={setCollected} variant="button" className="min-w-56" />
            ) : null}
          </div>
          {mine && collected.length > 0 && <p className="mt-2 text-caption text-muted">In {collected.map((c) => c.shelfName).join(", ")}</p>}
        </div>
      </section>

      <h2 className="mt-10 border-b border-border/70 pb-3 text-heading font-semibold tracking-tight">
        {hero.owners === 1 ? "The post" : `Posts from ${hero.owners.toLocaleString("en-US")} ${plural("owner", hero.owners)}`}
      </h2>
      <div className="pt-2">
        {posts.items.map((e, i) => <FeedPost key={e.id} entry={e} viewerId={viewerId} eager={i === 0} onPatch={patch} />)}
      </div>
      <div ref={sentinel} className="h-8" aria-hidden />
      {loading && <FeedSkeleton count={1} />}
    </div>
  );
}
