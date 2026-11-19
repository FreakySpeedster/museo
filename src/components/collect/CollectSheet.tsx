"use client";

import clsx from "clsx";
import { Check, Gem, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client";
import { Sheet, SheetFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { count } from "@/lib/plural";

interface Targets {
  isOwner: boolean;
  subscribed: boolean;
  limit: number;
  owned: Array<{ shelfId: string; shelfName: string }>;
  pages: Array<{ id: string; title: string; shelves: Array<{ id: string; name: string; category: string; itemCount: number; full: boolean; already: boolean }> }>;
}

export type Collected = Array<{ shelfId: string; shelfName: string }>;

/** Pick one of your collections (or make one) to copy someone else's item into. */
export function CollectSheet({ itemId, open, onClose, onCollected }: { itemId: string; open: boolean; onClose: () => void; onCollected: (c: Collected) => void }) {
  const [data, setData] = useState<Targets | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [upsell, setUpsell] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    let live = true;
    api<Targets>(`/api/items/${itemId}/collect`)
      .then((d) => live && setData(d))
      .catch((e) => {
        toast.error(e instanceof ApiError ? e.message : "Couldn't load your collections");
        onClose();
      });
    return () => {
      live = false;
      setData(null);
      setCreating(false);
      setUpsell(false);
      setName("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  async function add(body: { shelfId: string } | { newShelf: { name: string } }, label: string) {
    setBusy("shelfId" in body ? body.shelfId : "new");
    try {
      const r = await api<{ shelf: { id: string; name: string } }>(`/api/items/${itemId}/collect`, { method: "POST", json: body });
      const next = [...(data?.owned ?? []), { shelfId: r.shelf.id, shelfName: r.shelf.name }];
      onCollected(next);
      toast.success(`Added to ${r.shelf.name}`);
      window.dispatchEvent(new CustomEvent("nook:item-added"));
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ITEM_LIMIT") setUpsell(true);
      else toast.error(e instanceof ApiError ? e.message : `Couldn't add to ${label}`);
    } finally {
      setBusy(null);
    }
  }

  const multiPage = (data?.pages.length ?? 0) > 1;
  const empty = data && data.pages.every((p) => p.shelves.length === 0);

  return (
    <Sheet open={open} onClose={onClose} title="Add to my collection" size="sm">
      {!data ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><Skeleton className="h-4 flex-1 rounded-full" /></div>
          ))}
        </div>
      ) : (
        <div data-testid="collect-sheet">
          {data.owned.length > 0 && (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-success-subtle px-3 py-2.5 text-meta text-success" data-testid="collect-owned">
              <Check className="size-4 shrink-0" strokeWidth={2.4} aria-hidden />
              <span className="min-w-0 truncate">In your collection · {data.owned.map((o) => o.shelfName).join(", ")}</span>
            </p>
          )}
          {upsell && (
            <div className="mb-3 rounded-2xl border border-border bg-surface-hover p-4" data-testid="collect-upsell">
              <p className="flex items-center gap-2 text-body font-semibold"><Gem className="size-5" aria-hidden /> That collection is full</p>
              <p className="mt-1 text-meta text-muted">Free collections hold up to {data.limit} items. nook Plus removes the limit.</p>
              <Link href="/pricing" className="mt-3 inline-flex h-11 items-center rounded-full bg-accent px-5 text-meta font-semibold text-accent-contrast">See nook Plus</Link>
            </div>
          )}
          <div className="-mx-2">
            {data.pages.map((p) => (
              <div key={p.id}>
                {multiPage && p.shelves.length > 0 && <p className="px-3 pb-1 pt-3 text-caption font-medium uppercase tracking-wide text-muted">{p.title}</p>}
                <ul>
                  {p.shelves.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={s.already || busy !== null}
                        onClick={() => (s.full ? setUpsell(true) : void add({ shelfId: s.id }, s.name))}
                        className={clsx("flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors", !s.already && "hover:bg-surface-hover active:bg-surface-hover")}
                        data-testid="collect-target"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-hover"><CategoryIcon category={s.category} className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-medium">{s.name}</span>
                          <span className="block text-caption text-muted">{count(s.itemCount, "item")}</span>
                        </span>
                        {s.already ? (
                          <span className="inline-flex items-center gap-1 text-caption font-medium text-success"><Check className="size-4" strokeWidth={2.4} aria-hidden /> Already in</span>
                        ) : s.full ? (
                          <span className="inline-flex items-center gap-1 text-caption text-muted"><Lock className="size-4" aria-hidden /> Full</span>
                        ) : busy === s.id ? (
                          <span className="text-caption text-muted">Adding…</span>
                        ) : (
                          <Plus className="size-5 text-muted" aria-hidden />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {creating || empty ? (
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) void add({ newShelf: { name: name.trim() } }, name.trim());
              }}
            >
              <label htmlFor="collect-new" className="mb-1.5 block text-meta font-medium">{empty ? "Start a collection for it" : "New collection"}</label>
              <Input id="collect-new" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Favourite fragrances" enterKeyHint="done" />
              <SheetFooter>
                <Button type="submit" size="lg" className="w-full" disabled={!name.trim()} loading={busy === "new"}>Create and add</Button>
              </SheetFooter>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="-mx-2 mt-1 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-hover">
              <span className="grid size-10 place-items-center rounded-xl border border-dashed border-border"><Plus className="size-5" aria-hidden /></span>
              <span className="text-body font-medium">New collection</span>
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
