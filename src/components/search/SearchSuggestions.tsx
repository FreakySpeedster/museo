"use client";

import { ItemImage } from "@/components/art/ItemImage";
import { Clock, Flame, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SearchHit } from "@/lib/dto";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

const KEY = "museo.recent-searches";
const MAX = 8;
const EVENT = "museo:recent-searches";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Remember a query the user actually ran (on submit or result click). */
export function rememberSearch(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  const list = (JSON.parse(read()) as string[]).filter((x) => x.toLowerCase() !== v.toLowerCase());
  write([v, ...list]);
}

export function useRecentSearches(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Search before typing: recent searches (this device), people to follow and trending collections.
 * `onPick` runs a recent search; `onNavigate` closes an overlay before a link is followed.
 */
export function SearchSuggestions({ onPick, onNavigate }: { onPick: (q: string) => void; onNavigate?: () => void }) {
  const recent = useRecentSearches();
  const [data, setData] = useState<{ people: SearchHit[]; collections: SearchHit[] } | null>(null);

  useEffect(() => {
    let live = true;
    api<{ people: SearchHit[]; collections: SearchHit[] }>("/api/search/suggest")
      .then((r) => live && setData(r))
      .catch(() => live && setData({ people: [], collections: [] }));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-7" data-testid="search-suggestions">
      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-meta font-semibold">Recent</h2>
            <button type="button" onClick={() => write([])} className="min-h-11 px-1 text-caption font-medium text-muted hover:text-foreground">Clear all</button>
          </div>
          <ul className="-mx-2">
            {recent.map((q) => (
              <li key={q} className="flex items-center">
                <button type="button" onClick={() => onPick(q)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left text-body hover:bg-surface-hover">
                  <Clock className="size-5 shrink-0 text-muted" aria-hidden />
                  <span className="truncate">{q}</span>
                </button>
                <button type="button" aria-label={`Remove ${q}`} onClick={() => write(recent.filter((x) => x !== q))} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground">
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-meta font-semibold"><UserRound className="size-4" aria-hidden /> Suggested people</h2>
        {data === null ? (
          <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-28 shrink-0 rounded-2xl" />)}</div>
        ) : data.people.length === 0 ? (
          <p className="text-meta text-muted">You already follow everyone we would suggest.</p>
        ) : (
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {data.people.map((p) => (
              <li key={p.id} className="shrink-0">
                <Link href={p.href} onClick={onNavigate} className="flex w-28 flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-center transition-colors hover:bg-surface-hover">
                  <Avatar name={p.title} username={p.subtitle.replace(/^@/, "")} avatarUrl={p.imageUrl} size={56} />
                  <span className="w-full">
                    <span className="block truncate text-meta font-semibold">{p.title}</span>
                    <span className="block truncate text-caption text-muted">{p.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-meta font-semibold"><Flame className="size-4" aria-hidden /> Trending collections</h2>
        {data === null ? (
          <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />)}</div>
        ) : data.collections.length === 0 ? (
          <p className="text-meta text-muted">Nothing trending yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {data.collections.map((c) => (
              <li key={c.id}>
                <Link href={c.href} onClick={onNavigate} className="group block overflow-hidden rounded-2xl border border-border bg-surface">
                  <span className="block aspect-[4/3] overflow-hidden bg-surface-hover">
                    <ItemImage src={c.imageUrl} alt="" art={{ seed: c.id, title: c.title, collection: c.title }} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </span>
                  <span className="block p-2.5">
                    <span className="block truncate text-meta font-semibold">{c.title}</span>
                    <span className="block truncate text-caption text-muted">{c.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
