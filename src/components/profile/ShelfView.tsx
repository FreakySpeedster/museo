"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { Plus } from "lucide-react";
import { categoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Flip, ensureFlip, ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemCard } from "./ItemCard";

export function ShelfView({
  shelf,
  isOwner,
  justAddedId,
  registerCapture,
  onOpenItem,
  onAddItem,
  onEditShelf,
  onDeleteShelf,
  onReorder,
}: {
  shelf: ShelfDTO;
  isOwner: boolean;
  justAddedId: string | null;
  registerCapture: (id: string, fn: (() => void) | null) => void;
  onOpenItem: (item: ItemDTO) => void;
  onAddItem: (shelf: ShelfDTO) => void;
  onEditShelf: (shelf: ShelfDTO) => void;
  onDeleteShelf: (shelf: ShelfDTO) => void;
  onReorder: (shelfId: string, items: ItemDTO[], commit: boolean) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const meta = categoryMeta(shelf.category);
  const orderKey = shelf.items.map((i) => i.id).join(",");

  const capture = useCallback(() => {
    const Flip = ensureFlip();
    if (grid.current) flipState.current = Flip.getState(grid.current.querySelectorAll("[data-flip-id]"));
  }, []);

  useEffect(() => {
    registerCapture(shelf.id, capture);
    return () => registerCapture(shelf.id, null);
  }, [shelf.id, registerCapture, capture]);

  // Entrance: shelf header + items reveal as they scroll into view.
  useGSAP(
    () => {
      if (reducedMotion() || !grid.current) return;
      const ScrollTrigger = ensureScrollTrigger();
      const cards = gsap.utils.toArray<HTMLElement>("[data-reveal]", grid.current);
      gsap.from(root.current!.querySelectorAll("[data-shelf-head]"), { opacity: 0, duration: 0.3, ease: "power2.out" });
      gsap.set(cards, { opacity: 0, y: 10 });
      ScrollTrigger.batch(cards, {
        start: "top 94%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.05, overwrite: true }),
      });
      gsap.from(root.current!.querySelector("[data-plank]"), { opacity: 0, duration: 0.3, ease: "power2.out" });
    },
    { scope: root },
  );

  // Reorder / add / remove: animate siblings to their new positions with Flip.
  useGSAP(
    () => {
      if (reducedMotion() || !grid.current) return;
      if (flipState.current) {
        const Flip = ensureFlip();
        Flip.from(flipState.current, {
          targets: grid.current.querySelectorAll("[data-flip-id]"),
          duration: 0.5,
          ease: "power3.inOut",
          nested: false,
          overwrite: true,
        });
        flipState.current = null;
      }
    },
    { scope: grid, dependencies: [orderKey] },
  );

  // The satisfying "added!" moment.
  useGSAP(
    () => {
      if (!justAddedId || !grid.current || reducedMotion()) return;
      const el = grid.current.querySelector<HTMLElement>(`[data-flip-id="${justAddedId}"]`);
      if (!el) return;
      gsap.fromTo(el, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", clearProps: "all", overwrite: true });
    },
    { scope: grid, dependencies: [justAddedId] },
  );

  function onDragStart(e: DragEvent, item: ItemDTO) {
    setDragId(item.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  }
  function onDragOver(e: DragEvent, over: ItemDTO) {
    if (!dragId) return;
    e.preventDefault();
    if (over.id === dragId) return;
    const from = shelf.items.findIndex((i) => i.id === dragId);
    const to = shelf.items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    capture();
    const next = [...shelf.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(shelf.id, next, false);
  }
  function onDragEnd() {
    if (dragId) onReorder(shelf.id, shelf.items, true);
    setDragId(null);
  }

  return (
    <section ref={root} aria-label={shelf.name} data-shelf-id={shelf.id} className="space-y-3">
      <div data-shelf-head className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-heading font-semibold tracking-tight">
            <CategoryIcon category={shelf.category} className="size-5 shrink-0 text-accent" />
            <span className="truncate">{shelf.name}</span>
          </h3>
          <p className="text-caption text-muted">
            {meta.label} · {shelf.items.length} {shelf.items.length === 1 ? "item" : "items"}
          </p>
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" onClick={() => onAddItem(shelf)} aria-label={`Add item to ${shelf.name}`}>
              <Plus className="size-4" aria-hidden strokeWidth={2.4} /> Add item
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onEditShelf(shelf)} aria-label={`Rename ${shelf.name}`}>Rename</Button>
            <Button size="sm" variant="ghost" onClick={() => onDeleteShelf(shelf)} aria-label={`Delete ${shelf.name}`} className="hover:text-danger">Delete</Button>
          </div>
        )}
      </div>

      {shelf.items.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<CategoryIcon category={shelf.category} className="size-10" />}
          title="This shelf is empty"
          description={isOwner ? "Add a link or a photo to start your collection." : "Nothing here yet."}
          action={isOwner ? <Button size="sm" onClick={() => onAddItem(shelf)}>Add the first item</Button> : undefined}
        />
      ) : (
        <div ref={grid} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5" onDragOver={(e) => dragId && e.preventDefault()}>
          {shelf.items.map((item) => (
            <div
              key={item.id}
              data-flip-id={item.id}
              data-reveal
              draggable={isOwner}
              onDragStart={(e) => onDragStart(e, item)}
              onDragOver={(e) => onDragOver(e, item)}
              onDragEnd={onDragEnd}
              className="relative"
            >
              <ItemCard item={item} onOpen={onOpenItem} dragging={dragId === item.id} grab={isOwner} />
            </div>
          ))}
        </div>
      )}
      <div data-plank className="plank" aria-hidden />
    </section>
  );
}
