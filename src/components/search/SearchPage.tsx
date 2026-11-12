"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Package, Rows3, Search, UserRound } from "lucide-react";
import type { SearchHit, SearchSort, SearchType } from "@/lib/dto";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
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

  function push(next: { q?: string; type?: SearchType; sort?: SearchSort }) {
    const nq = next.q ?? q;
    const nt = next.type ?? type;
    const ns = next.sort ?? sort;
    const sp = new URLSearchParams();
    if (nq) sp.set("q", nq);
    if (nt !== "all") sp.set("type", nt);
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-sm focus-within:border-foreground">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search people, items, and shelves"
          className="h-12 w-full bg-transparent text-body outline-none placeholder:text-muted"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search"
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Result type"
          value={type}
          onChange={(v) => {
            setType(v);
            push({ type: v });
          }}
          options={[
            { value: "all", label: "All" },
            { value: "people", label: "People" },
            { value: "items", label: "Items" },
            { value: "shelves", label: "Shelves" },
          ]}
        />
        <Menu
          label="Sort"
          items={SORTS.map((s) => ({
            label: s.label,
            onSelect: () => {
              setSort(s.value);
              push({ sort: s.value });
            },
          }))}
          trigger={({ props, open }) => (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-meta text-muted hover:text-foreground"
              {...props}
            >
              {sortLabel}
              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
        />
      </div>
      <div className="mt-6 space-y-2">
        {!q.trim() && <p className="text-body text-muted">Start typing to search nook.</p>}
        {q.trim() && items.length === 0 && !loading && (
          <EmptyState icon={<Search className="size-10" aria-hidden />} title="No results" description="Try a different word or filter." />
        )}
        {items.map((h) => {
          const Icon = ICONS[h.kind];
          return (
            <Link key={`${h.kind}-${h.id}`} href={h.href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-hover">
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
                <span className="block truncate text-heading font-semibold">{h.title}</span>
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
