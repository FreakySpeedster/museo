"use client";

import clsx from "clsx";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_GROUPS, CUSTOM_MAX, categoryMeta, makeCustomCategory, type CategoryDef } from "@/lib/categories";
import { gsap, reducedMotion } from "@/lib/gsap";
import { CategoryIcon } from "./CategoryIcon";

type Option = { key: string; id: string; label: string; def?: CategoryDef; custom?: boolean };
type Row = { type: "group"; name: string } | { type: "option"; index: number; option: Option };
type Rect = { top: number; left: number; width: number; maxH: number; above: boolean; sheet: boolean };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * On-brand replacement for a native <select>: searchable, grouped, keyboard-accessible combobox with
 * Lucide icons, a "create your own" option, and a bottom-sheet layout on small screens.
 */
export function CategoryPicker({
  value,
  onChange,
  id,
  name,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { rows, options } = useMemo(() => {
    const q = norm(query);
    const rows: Row[] = [];
    const options: Option[] = [];
    for (const g of CATEGORY_GROUPS) {
      const matches = g.items.filter((c) => !q || norm(`${c.label} ${c.id} ${c.keywords ?? ""} ${g.name}`).includes(q));
      if (!matches.length) continue;
      rows.push({ type: "group", name: g.name });
      for (const def of matches) {
        const option: Option = { key: def.id, id: def.id, label: def.label, def };
        rows.push({ type: "option", index: options.length, option });
        options.push(option);
      }
    }
    const typed = query.replace(/\s+/g, " ").trim().slice(0, CUSTOM_MAX);
    if (typed && !options.some((o) => norm(o.label) === norm(typed))) {
      const option: Option = { key: "custom-new", id: makeCustomCategory(typed), label: typed, custom: true };
      rows.push({ type: "group", name: "Your own" });
      rows.push({ type: "option", index: options.length, option });
      options.push(option);
    }
    return { rows, options };
  }, [query]);

  const measure = useCallback((): Rect | null => {
    const el = trigger.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const sheet = window.innerWidth < 640;
    const below = window.innerHeight - r.bottom - 12;
    const aboveRoom = r.top - 12;
    const above = !sheet && below < 260 && aboveRoom > below;
    const maxH = Math.max(200, Math.min(360, above ? aboveRoom : below));
    return { top: above ? r.top - 6 : r.bottom + 6, left: r.left, width: r.width, maxH, above, sheet };
  }, []);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) trigger.current?.focus();
  }, []);

  function openPicker() {
    if (disabled) return;
    setRect(measure());
    setQuery("");
    setOpen(true);
    const idx = Math.max(0, CATEGORY_GROUPS.flatMap((g) => g.items).findIndex((c) => c.id === value));
    setActive(idx);
  }

  // Focus the search box and animate in as soon as the popup mounts.
  const setPopup = useCallback((el: HTMLDivElement | null) => {
    popup.current = el;
    if (!el) return;
    input.current?.focus({ preventScroll: true });
    if (!reducedMotion()) {
      const sheet = window.innerWidth < 640;
      gsap.fromTo(el, { opacity: 0, y: sheet ? 40 : -6, scale: sheet ? 1 : 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "power3.out", clearProps: "transform" });
      const items = el.querySelectorAll("[data-cat-row]");
      gsap.fromTo(items, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.004, ease: "power1.out", delay: 0.05, clearProps: "all" });
    }
  }, []);

  function scrollActive(i: number) {
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: "nearest" }));
  }

  function move(next: number) {
    if (!options.length) return;
    const i = (next + options.length) % options.length;
    setActive(i);
    scrollActive(i);
  }

  function choose(o: Option | undefined) {
    if (!o) return;
    onChange(o.id);
    close();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't close the surrounding dialog
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation(); // don't submit the form
      choose(options[active]);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  const meta = categoryMeta(value);
  const safeActive = Math.min(active, Math.max(0, options.length - 1));
  const activeId = options.length ? `${uid}-opt-${safeActive}` : undefined;

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openPicker();
          }
        }}
        className="control flex items-center gap-2.5 text-left"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent">
          <CategoryIcon category={value} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">{meta.label}</span>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-popover" onPointerDown={() => close(false)} aria-hidden />
            <div
              ref={setPopup}
              onKeyDown={onKeyDown}
              data-testid="category-popup"
              className={clsx(
                "fixed z-popover flex flex-col overflow-hidden border border-border bg-surface-raised shadow-lg",
                rect.sheet ? "inset-x-0 bottom-0 max-h-[75dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)]" : "rounded-2xl",
              )}
              style={
                rect.sheet
                  ? undefined
                  : { left: rect.left, width: rect.width, maxHeight: rect.maxH, ...(rect.above ? { bottom: window.innerHeight - rect.top } : { top: rect.top }) }
              }
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <Search className="size-4 shrink-0 text-muted" aria-hidden />
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  role="searchbox"
                  aria-label="Search categories"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  placeholder="Search or type your own"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={CUSTOM_MAX}
                  className="min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-muted/70 outline-none focus:outline-none focus-visible:!outline-none"
                />
              </div>
              <div ref={listRef} id={listId} role="listbox" aria-label="Categories" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                {rows.map((r, i) =>
                  r.type === "group" ? (
                    <div key={`g-${r.name}-${i}`} data-cat-row role="presentation" className="px-2.5 pb-1 pt-2.5 text-micro font-semibold uppercase tracking-wider text-muted first:pt-1">
                      {r.name}
                    </div>
                  ) : (
                    <div
                      key={r.option.key}
                      id={`${uid}-opt-${r.index}`}
                      data-cat-row
                      data-index={r.index}
                      role="option"
                      aria-selected={r.option.id === value}
                      onPointerMove={() => r.index !== safeActive && setActive(r.index)}
                      onClick={() => choose(r.option)}
                      className={clsx(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-body transition-colors",
                        r.index === safeActive ? "bg-accent-subtle text-foreground" : "text-foreground/90",
                      )}
                    >
                      <span className={clsx("grid size-7 shrink-0 place-items-center rounded-lg", r.index === safeActive ? "bg-accent text-accent-contrast" : "bg-surface-hover text-muted")}>
                        {r.option.custom ? <Plus className="size-4" aria-hidden /> : <CategoryIcon category={r.option.id} className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.option.custom ? `Use “${r.option.label}”` : r.option.label}</span>
                      {r.option.id === value && <Check className="size-4 shrink-0 text-accent" aria-hidden strokeWidth={2.6} />}
                    </div>
                  ),
                )}
                {!options.length && <p className="px-3 py-6 text-center text-meta text-muted">No matches. Type a name to create your own category.</p>}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
