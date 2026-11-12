"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  icon?: ReactNode;
  hidden?: boolean;
}

export function Menu({
  label,
  items,
  align = "end",
  trigger,
}: {
  label: string;
  items: MenuItem[];
  align?: "start" | "end";
  trigger: (opts: { open: boolean; props: { "aria-expanded": boolean; "aria-haspopup": "menu"; "aria-controls": string; id: string; onClick: () => void } }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnId = useId();
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const visible = items.filter((i) => !i.hidden);

  function place() {
    const el = wrap.current?.querySelector<HTMLElement>("[aria-haspopup='menu']") ?? wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 200;
    const left = align === "end" ? Math.min(window.innerWidth - width - 8, Math.max(8, r.right - width)) : Math.max(8, r.left);
    let top = r.bottom + 6;
    const estimated = visible.length * 40 + 16;
    if (top + estimated > window.innerHeight - 8) top = Math.max(8, r.top - estimated - 6);
    setPos({ top, left, width });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        wrap.current?.querySelector<HTMLElement>("[aria-haspopup='menu']")?.focus();
      }
    };
    const onScroll = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    const t = setTimeout(() => menu.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible.length, align]);

  function onMenuKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      nodes[(i + 1) % nodes.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nodes[(i - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      nodes[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      nodes[nodes.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrap} className="relative inline-flex">
      {trigger({
        open,
        props: {
          "aria-expanded": open,
          "aria-haspopup": "menu",
          "aria-controls": menuId,
          id: btnId,
          onClick: () => setOpen((v) => !v),
        },
      })}
      {open && pos &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={label}
            aria-labelledby={btnId}
            onKeyDown={onMenuKey}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[var(--z-popover)] rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            {visible.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-meta transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover",
                  it.danger ? "text-danger hover:text-danger" : "text-foreground",
                )}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
