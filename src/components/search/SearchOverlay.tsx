"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowRight, Package, Search, UserRound, Rows3 } from "lucide-react";
import type { SearchHit } from "@/lib/dto";
import { Avatar } from "@/components/ui/Avatar";

const ICONS = { person: UserRound, item: Package, shelf: Rows3 };

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    // Reset the query each time the overlay opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ("");
    setHits([]);
    setActive(0);
    const t = setTimeout(() => input.current?.focus(), 20);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    abort.current?.abort();
    const query = q.trim();
    if (!open) return;
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(() => {
      const ac = new AbortController();
      abort.current = ac;
      fetch(`/api/search?preview=1&limit=5&q=${encodeURIComponent(query)}`, { signal: ac.signal, credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.items ?? []);
          setActive(0);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setHits([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [q, open]);

  const more = { href: `/search?q=${encodeURIComponent(q.trim())}`, title: "Show more results" };
  const total = hits.length + (q.trim() ? 1 : 0);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (total ? (i + 1) % total : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (total ? (i - 1 + total) % total : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < hits.length) go(hits[active].href);
      else if (q.trim()) go(more.href);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-md" aria-label="Close search" onClick={onClose} />
      <div className="search-spotlight relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-lg" tabIndex={-1}>
        <div className={`flex items-center gap-2 px-4 ${q.trim() ? "border-b border-border" : ""}`}>
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search people, items, and shelves"
            className="h-14 w-full bg-transparent text-body outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-micro text-muted sm:inline">esc</kbd>
        </div>
        {q.trim() && (
        <ul id="search-results" role="listbox" className="max-h-[min(24rem,50vh)] overflow-y-auto p-1">
          {loading && q.trim() && hits.length === 0 && <li className="px-3 py-3 text-caption text-muted">Searching…</li>}
          {!loading && q.trim() && hits.length === 0 && <li className="px-3 py-3 text-caption text-muted">No matches. Try a different word.</li>}
          {hits.map((h, i) => {
            const Icon = ICONS[h.kind];
            const on = i === active;
            return (
              <li key={`${h.kind}-${h.id}`} role="option" aria-selected={on}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${on ? "bg-surface-hover" : ""}`}
                >
                  {h.kind === "person" ? (
                    <Avatar name={h.title} username={h.subtitle.replace(/^@/, "")} avatarUrl={h.imageUrl} size="sm" />
                  ) : h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.imageUrl} alt="" className="size-8 rounded-md object-cover" />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-md bg-surface-hover text-muted">
                      <Icon className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-meta font-medium">{h.title}</span>
                    <span className="block truncate text-caption text-muted">{h.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {q.trim() && (
            <li role="option" aria-selected={active === hits.length}>
              <button
                type="button"
                onMouseEnter={() => setActive(hits.length)}
                onClick={() => go(more.href)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-meta font-medium ${active === hits.length ? "bg-surface-hover" : ""}`}
              >
                <ArrowRight className="size-4" aria-hidden />
                Show more results
              </button>
            </li>
          )}
        </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
