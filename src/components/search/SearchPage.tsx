"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Check, Package, Rows3, Search, UserRound, X } from "lucide-react";
import type { SearchHit, SearchSort, SearchType } from "@/lib/dto";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchSuggestions, rememberSearch } from "./SearchSuggestions";
import { Tabs } from "@/components/ui/Tabs";
import { timeAgo } from "@/lib/time";

const SORTS: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

const ICONS = { person: UserRound, item: Package, shelf: Rows3 };

export function SearchPage({ initialQ, initialType, initialSort }: { initialQ: string; initialType: SearchType; initialSort: SearchSort }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [draft, setDraft] = useState(initialQ);
  const [type, setType] = useState<SearchType>(initialType);
  const [sort, setSort] = useState<SearchSort>(initialSort);
  const [items, setItems] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number>(0);
  const [sortOpen, setSortOpen] = useState(false);

  function push(next: { q?: string; type?: SearchType; sort?: SearchSort }) {
    const nq = next.q ?? q;
    const nt = next.type ?? type;
    const ns = next.sort ?? sort;
    const sp = new URLSearchParams();
    if (nq) sp.set("q", nq);
    if (nt !== "all") sp.set("type", nt === "shelves" ? "collections" : nt);
    if (ns !== "relevance") sp.set("sort", ns);
    router.replace(`/search?${sp.toString()}`, { scroll: false });
  }

  async function load(reset: boolean, query: string, typ: SearchType, srt: SearchSort, cur?: string | null) {
    if (!query.trim()) {
      setItems([]);
      setCursor(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ items: SearchHit[]; nextCursor: string | null }>(
        `/api/search?q=${encodeURIComponent(query)}&type=${typ}&sort=${srt}${cur ? `&cursor=${encodeURIComponent(cur)}` : ""}`,
      );
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true, q, type, sort);
  }, [q, type, sort]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const next = draft.trim();
      if (next === q) return;
      setQ(next);
      push({ q: next });
    }, 250);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Relevance";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-3 sm:px-6 md:pt-8">
      <div className="flex items-center gap-2 field-shell rounded-full px-4 sm:shadow-sm">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rememberSearch(draft)}
          placeholder="Search people, items, and collections"
          autoFocus={!initialQ}
          className="h-11 w-full bg-transparent sm:h-12 text-body outline-none placeholder:text-muted"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
          aria-label="Search"
        />
        {draft && (
          <button type="button" aria-label="Clear search" onClick={() => setDraft("")} className="-mr-3 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {q.trim() && (
        <div className="-mx-4 mt-3 flex items-center border-b border-border pr-2 sm:-mx-6">
          <Tabs
            label="Result type"
            className="flex-1 border-b-0"
            value={type}
            onChange={(v) => {
              setType(v);
              push({ type: v });
            }}
            options={[
              { value: "all", label: "All" },
              { value: "people", label: "People" },
              { value: "items", label: "Items" },
              { value: "shelves", label: "Collections" },
            ]}
          />
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-label={`Sort: ${sortLabel}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground"
            data-testid="sort-button"
          >
            <ArrowUpDown className="size-5" aria-hidden />
          </button>
        </div>
      )}
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort results" size="sm">
        <ul className="-mx-2" role="radiogroup" aria-label="Sort">
          {SORTS.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="radio"
                aria-checked={sort === o.value}
                onClick={() => {
                  setSort(o.value);
                  push({ sort: o.value });
                  setSortOpen(false);
                }}
                className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-body hover:bg-surface-hover"
              >
                {o.label}
                {sort === o.value && <Check className="size-5" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <div className="mt-3 space-y-0 sm:mt-5 sm:space-y-2">
        {!q.trim() && <SearchSuggestions onPick={(v) => setDraft(v)} />}
        {q.trim() && loading && items.length === 0 && (
          <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />)}</div>
        )}
        {q.trim() && items.length === 0 && !loading && (
          <EmptyState icon={<Search className="size-6" aria-hidden />} title="No results" description="Try a different word or filter." />
        )}
        {items.map((h) => {
          const Icon = ICONS[h.kind];
          return (
            <Link key={`${h.kind}-${h.id}`} href={h.href} onClick={() => rememberSearch(q)} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-hover sm:mx-0 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-3">
              {h.kind === "person" ? (
                <Avatar name={h.title} username={h.subtitle.replace(/^@/, "")} avatarUrl={h.imageUrl} size="md" />
              ) : h.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.imageUrl} alt="" className="size-12 rounded-lg object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-lg bg-surface-hover text-muted">
                  <Icon className="size-5" aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{h.title}</span>
                <span className="block truncate text-caption text-muted">
                  {h.subtitle} · {timeAgo(h.createdAt)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {cursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" loading={loading} onClick={() => load(false, q, type, sort, cursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
