"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from "lucide-react";
import { categoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { VisibilityLock } from "@/components/ui/VisibilityLock";
import { ItemCard } from "./ItemCard";

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (opts: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: CSSProperties;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    isDragging: boolean;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    touchAction: disabled ? undefined : "manipulation",
  };
  return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}

export function ShelfView({
  shelf,
  isOwner,
  justAddedId,
  pagePrivate,
  canMoveUp,
  canMoveDown,
  registerCapture,
  onOpenItem,
  onAddItem,
  onEditShelf,
  onDeleteShelf,
  onReorder,
  onMoveShelf,
  onToggleVisibility,
}: {
  shelf: ShelfDTO;
  isOwner: boolean;
  justAddedId: string | null;
  pagePrivate?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  registerCapture: (id: string, fn: (() => void) | null) => void;
  onOpenItem: (item: ItemDTO) => void;
  onAddItem: (shelf: ShelfDTO) => void;
  onEditShelf: (shelf: ShelfDTO) => void;
  onDeleteShelf: (shelf: ShelfDTO) => void;
  onReorder: (shelfId: string, items: ItemDTO[], commit: boolean) => void;
  onMoveShelf?: (shelf: ShelfDTO, dir: -1 | 1) => void;
  onToggleVisibility?: (shelf: ShelfDTO) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const meta = categoryMeta(shelf.category);
  const locked = shelf.visibility === "private" || pagePrivate;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const capture = useCallback(() => {}, []);
  useEffect(() => {
    registerCapture(shelf.id, capture);
    return () => registerCapture(shelf.id, null);
  }, [shelf.id, registerCapture, capture]);

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

  useGSAP(
    () => {
      if (!justAddedId || !grid.current || reducedMotion()) return;
      const el = grid.current.querySelector<HTMLElement>(`[data-flip-id="${justAddedId}"]`);
      if (!el) return;
      gsap.fromTo(el, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", clearProps: "all", overwrite: true });
    },
    { scope: grid, dependencies: [justAddedId] },
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = shelf.items.findIndex((i) => i.id === active.id);
    const to = shelf.items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(shelf.items, from, to).map((i, n) => ({ ...i, position: n }));
    onReorder(shelf.id, next, false);
    void onReorder(shelf.id, next, true);
  }

  return (
    <section ref={root} aria-label={shelf.name} data-shelf-id={shelf.id} className="space-y-3">
      <div data-shelf-head className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-heading font-semibold leading-tight tracking-tight">
            <CategoryIcon category={shelf.category} className="size-5 shrink-0 text-accent" />
            <span className="min-w-0 truncate">{shelf.name}</span>
            {isOwner && locked && <VisibilityLock label={pagePrivate ? "Hidden because the page is private" : "Private shelf"} />}
          </h3>
          <p className="text-caption text-muted">
            {meta.label} · {shelf.items.length} {shelf.items.length === 1 ? "item" : "items"}
          </p>
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" onClick={() => onAddItem(shelf)} aria-label={`Add item to ${shelf.name}`}>
              <Plus className="size-4" aria-hidden strokeWidth={2.4} /><span className="hidden sm:inline">Add item</span>
            </Button>
            <Menu
              label={`Actions for ${shelf.name}`}
              items={[
                { label: "Rename", onSelect: () => onEditShelf(shelf) },
                { label: shelf.visibility === "private" ? "Make public" : "Make private", hidden: !onToggleVisibility, onSelect: () => onToggleVisibility?.(shelf) },
                { label: "Move up", icon: <ArrowUp className="size-4" aria-hidden />, hidden: !onMoveShelf || !canMoveUp, onSelect: () => onMoveShelf?.(shelf, -1) },
                { label: "Move down", icon: <ArrowDown className="size-4" aria-hidden />, hidden: !onMoveShelf || !canMoveDown, onSelect: () => onMoveShelf?.(shelf, 1) },
                { label: "Delete", danger: true, onSelect: () => onDeleteShelf(shelf) },
              ]}
              trigger={({ props }) => (
                <IconButton label={`More actions for ${shelf.name}`} size="sm" {...props}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </IconButton>
              )}
            />
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shelf.items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div ref={grid} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {shelf.items.map((item) => (
                <SortableItem key={item.id} id={item.id} disabled={!isOwner}>
                  {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      data-flip-id={item.id}
                      data-reveal
                      className="relative"
                      {...(isOwner ? { ...attributes, ...listeners } : {})}
                    >
                      <ItemCard item={item} onOpen={onOpenItem} dragging={isDragging} grab={isOwner} />
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <hr data-plank className="!mt-8 border-0 border-t border-border" aria-hidden />
    </section>
  );
}
