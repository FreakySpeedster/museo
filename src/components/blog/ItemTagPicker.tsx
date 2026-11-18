"use client";

import clsx from "clsx";
import { Check, Image as ImageIcon, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TaggedItemDTO } from "@/lib/dto";
import { api } from "@/lib/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Segmented } from "@/components/ui/Tabs";

export const MAX_TAGGED_ITEMS = 12;

export function ItemThumbMini({ item, className }: { item: Pick<TaggedItemDTO, "imageUrl" | "faviconUrl" | "title">; className?: string }) {
  const src = item.imageUrl ?? item.faviconUrl;
  return (
    <span className={clsx("grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-hover", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={item.imageUrl ? "h-full w-full object-cover" : "size-1/2 object-contain"} loading="lazy" />
      ) : (
        <ImageIcon className="size-4 text-muted" aria-hidden />
      )}
    </span>
  );
}

/** Tagged items as removable chips plus a picker dialog (your items first, or anything public on nook). */
export function ItemTagPicker({ value, onChange, variant = "list" }: { value: TaggedItemDTO[]; onChange: (items: TaggedItemDTO[]) => void; variant?: "list" | "chips" }) {
  const [open, setOpen] = useState(false);
  const dialog = (
    <Modal open={open} onClose={() => setOpen(false)} title="Tag items" description={`Up to ${MAX_TAGGED_ITEMS} items`} size="md">
      {open && <PickerBody value={value} onChange={onChange} onDone={() => setOpen(false)} />}
    </Modal>
  );
  if (variant === "chips") {
    // Phone composer: one scrolling row under the title. Tap a chip's x to untag, the dashed chip to add.
    return (
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1" data-testid="tag-chips">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={value.length >= MAX_TAGGED_ITEMS}
          data-testid="tag-items"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-meta font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden /> {value.length ? "Tag" : "Tag items"}
        </button>
        {value.map((it) => (
          <span key={it.id} className="inline-flex h-11 max-w-56 shrink-0 items-center gap-2 rounded-full border border-border bg-surface pl-1.5 text-meta">
            <ItemThumbMini item={it} className="size-8 rounded-full" />
            <span className="truncate font-medium">{it.title}</span>
            <button type="button" aria-label={`Untag ${it.title}`} onClick={() => onChange(value.filter((v) => v.id !== it.id))} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-foreground">
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        {dialog}
      </div>
    );
  }
  return (
    <div>
      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl border border-border p-2 pr-1.5">
              <ItemThumbMini item={it} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-meta font-medium">{it.title}</span>
                <span className="block truncate text-caption text-muted">{it.collection} · @{it.username}</span>
              </span>
              <button type="button" aria-label={`Untag ${it.title}`} onClick={() => onChange(value.filter((v) => v.id !== it.id))} data-hit="compact" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground">
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-muted">Tag the items this post is about. It will show up on their pages.</p>
      )}
      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setOpen(true)} disabled={value.length >= MAX_TAGGED_ITEMS} data-testid="tag-items">
        <Plus className="size-4" aria-hidden /> {value.length ? "Tag more items" : "Tag items"}
      </Button>
      {dialog}
    </div>
  );
}

function PickerBody({ value, onChange, onDone }: { value: TaggedItemDTO[]; onChange: (items: TaggedItemDTO[]) => void; onDone: () => void }) {
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TaggedItemDTO[] | null>(null);
  const req = useRef(0);
  const picked = new Set(value.map((v) => v.id));

  useEffect(() => {
    const id = ++req.current;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ items: TaggedItemDTO[] }>(`/api/blog/items?scope=${scope}&q=${encodeURIComponent(q.trim())}`);
        if (id === req.current) setResults(r.items);
      } catch {
        if (id === req.current) setResults([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, scope]);

  function toggle(it: TaggedItemDTO) {
    if (picked.has(it.id)) onChange(value.filter((v) => v.id !== it.id));
    else if (value.length < MAX_TAGGED_ITEMS) onChange([...value, it]);
  }

  return (
    <div className="space-y-3">
      <Segmented label="Where to look" spread value={scope} onChange={(v) => { setScope(v); setResults(null); }} options={[{ value: "mine", label: "Your items" }, { value: "all", label: "All of nook" }]} />
      <label className="relative block">
        <span className="sr-only">Search items</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or tag" className="h-10 w-full rounded-full border border-border bg-surface-hover pl-9 pr-3 text-meta outline-none focus:border-accent focus:bg-surface" />
      </label>
      <div className="h-[46dvh] overflow-y-auto sm:h-80">
        {results === null ? (
          <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-meta text-muted">{q ? "Nothing matches that search." : scope === "mine" ? "You haven't added any items yet." : "Nothing to show yet."}</p>
        ) : (
          <ul className="space-y-1">
            {results.map((it) => {
              const on = picked.has(it.id);
              return (
                <li key={it.id}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(it)} disabled={!on && value.length >= MAX_TAGGED_ITEMS} className={clsx("flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors disabled:opacity-50", on ? "bg-accent-subtle" : "hover:bg-surface-hover")}>
                    <ItemThumbMini item={it} className="size-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-meta font-medium">{it.title}</span>
                      <span className="block truncate text-caption text-muted">{it.collection} · @{it.username}</span>
                    </span>
                    <span className={clsx("grid size-6 shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-accent-contrast" : "border-border")}>
                      {on && <Check className="size-3.5" aria-hidden strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-caption text-muted">{value.length}/{MAX_TAGGED_ITEMS} tagged</p>
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
