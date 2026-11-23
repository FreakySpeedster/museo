"use client";

import clsx from "clsx";
import { RotateCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { SuggestedCollector, TopicSummary, TrendingCollection } from "@/lib/services/discovery";
import { api } from "@/lib/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { CollectionCard } from "./CollectionCard";
import { CollectorCard } from "./CollectorCard";
import { TopicChips } from "./TopicChips";

export interface DiscoverData {
  topics: TopicSummary[];
  trending: TrendingCollection[];
  trendingFallback: boolean;
  people: SuggestedCollector[];
}

/** Section title row used across discovery surfaces. */
export function SectionHead({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-body font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

/** Horizontal, snap-scrolling row that bleeds to the screen edge on phones. */
export function Carousel({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <ul aria-label={label} className={clsx("no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6", className)} style={{ scrollbarWidth: "none" }}>
      {children}
    </ul>
  );
}

function useDiscover() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (data) return;
    let live = true;
    api<DiscoverData>("/api/discover")
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [data, attempt]);
  return {
    data,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((a) => a + 1);
    },
  };
}

function RetryLine({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-meta text-muted" role="status">
      Couldn’t load suggestions.
      <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-foreground hover:bg-surface-hover">
        <RotateCw className="size-4" aria-hidden /> Retry
      </button>
    </div>
  );
}

export function PeopleRow({ people, signedIn, title = "People you might like" }: { people: SuggestedCollector[]; signedIn: boolean; title?: string }) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="people-head" data-testid="people-row">
      <SectionHead id="people-head" title={title} />
      <Carousel label={title}>
        {people.map((p) => (
          <li key={p.user.id} className="w-40 shrink-0 snap-start">
            <CollectorCard s={p} signedIn={signedIn} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

export function TrendingRow({ collections, fallback, title }: { collections: TrendingCollection[]; fallback?: boolean; title?: string }) {
  if (collections.length === 0) return null;
  const t = title ?? (fallback ? "Popular collections" : "Trending collections");
  return (
    <section aria-labelledby="trending-head" data-testid="trending-row">
      <SectionHead id="trending-head" title={t} action={!fallback && <span className="text-caption text-muted">This week</span>} />
      <Carousel label={t}>
        {collections.map((c, i) => (
          <li key={c.id} className="w-60 shrink-0 snap-start">
            <CollectionCard c={c} eager={i < 2} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

function RailSkeleton() {
  return (
    <div className="space-y-7" aria-hidden>
      <div className="flex gap-2 overflow-hidden">
        {[88, 112, 96, 120].map((w, i) => <Skeleton key={i} className="h-11 shrink-0 rounded-full" style={{ width: w }} />)}
      </div>
      <div>
        <Skeleton className="mb-3 h-5 w-44 rounded-full" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className="w-60 shrink-0">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-3 h-5 w-48 rounded-full" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

/** Explore's top rail: topic chips, trending collections, people you might like. Hides sections with nothing to show. */
export function DiscoverRail({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const { data, failed, retry } = useDiscover();
  if (failed) return <RetryLine onRetry={retry} />;
  return (
    <div className={clsx("mt-4 space-y-7", className)} data-testid="discover-rail" aria-busy={!data || undefined}>
      {!data ? (
        <RailSkeleton />
      ) : (
        <>
          {data.topics.length > 0 && (
            <section aria-labelledby="topics-head">
              <SectionHead id="topics-head" title="Topics" />
              <TopicChips topics={data.topics} />
            </section>
          )}
          <TrendingRow collections={data.trending} fallback={data.trendingFallback} />
          <PeopleRow people={data.people} signedIn={signedIn} />
        </>
      )}
    </div>
  );
}

/** Just the people row (Home's empty Following feed). */
export function PeopleSuggestions({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const { data, failed, retry } = useDiscover();
  if (failed) return <RetryLine onRetry={retry} />;
  if (!data) {
    return (
      <div className={clsx("flex gap-3 overflow-hidden", className)} aria-hidden>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-2xl" />)}
      </div>
    );
  }
  if (data.people.length === 0) return null;
  return (
    <div className={className}>
      <PeopleRow people={data.people} signedIn={signedIn} title="Collectors to follow" />
    </div>
  );
}
