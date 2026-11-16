"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { controlClass } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/** On-brand single select: a button trigger with a portalled listbox (works inside modals). */
export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  label,
}: {
  id?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 180 && above > below;
      const maxHeight = Math.min(280, up ? above : below);
      setPos({ left: r.left, width: r.width, maxHeight, top: up ? r.top - 6 - Math.min(maxHeight, options.length * 44 + 8) : r.bottom + 6 });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || list.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const raf = requestAnimationFrame(() => list.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  function openList() {
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : Math.max(0, options.findIndex((o) => !o.disabled)));
    setOpen(true);
  }

  function step(dir: 1 | -1) {
    if (!options.some((o) => !o.disabled)) return;
    let i = active;
    do i = (i + dir + options.length) % options.length;
    while (options[i].disabled);
    setActive(i);
    list.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function pick(o: SelectOption) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
    btn.current?.focus();
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") (e.preventDefault(), step(1));
    else if (e.key === "ArrowUp") (e.preventDefault(), step(-1));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), options[active] && pick(options[active]));
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // close the list, not the surrounding dialog
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
  }

  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={selected ? `${label}: ${selected.label}` : label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) (e.preventDefault(), openList());
        }}
        className={clsx(controlClass, "flex items-center gap-2 text-left", open && "border-[var(--focus)]")}
      >
        {selected?.icon}
        <span className={clsx("min-w-0 flex-1 truncate", !selected && "text-muted")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-[var(--duration-fast)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKey}
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className="fixed z-[var(--z-popover)] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg outline-none"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => pick(o)}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-meta",
                  o.disabled ? "cursor-not-allowed text-muted opacity-60" : "text-foreground",
                  i === active && !o.disabled && "bg-surface-hover",
                )}
              >
                {o.icon}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-caption text-muted">{o.hint}</span>}
                {o.value === value && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
