"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { gsap, reducedMotion } from "@/lib/gsap";
import { IconButton } from "./IconButton";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([type="hidden"]),select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dismissible?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);

  if (open && !visible) setVisible(true);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      return;
    }
    if (!visible) return;
    const done = () => {
      if (openRef.current) return;
      setVisible(false);
      lastFocus.current?.focus?.();
    };
    if (reducedMotion() || !panel.current) {
      const t = setTimeout(done, 0);
      return () => clearTimeout(t);
    }
    gsap.to(backdrop.current, { opacity: 0, duration: 0.2 });
    gsap.to(panel.current, { y: 24, opacity: 0, scale: 0.97, duration: 0.2, ease: "power2.in", onComplete: done });
  }, [open, visible]);

  useEffect(() => {
    if (!visible || !open) return;
    document.body.style.overflow = "hidden";
    document.body.dataset.modal = "open";
    if (!reducedMotion() && panel.current) {
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(panel.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" });
    }
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 60);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      delete document.body.dataset.modal;
    };
  }, [visible, open]);

  useEffect(() => {
    if (!visible || !open || !dismissible) return;
    const onDoc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (e.target === document.body || e.target === document.documentElement)) onClose();
    };
    document.addEventListener("keydown", onDoc);
    return () => document.removeEventListener("keydown", onDoc);
  }, [visible, open, dismissible, onClose]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [dismissible, onClose],
  );

  // Phones: drag the handle / header down to dismiss (bottom-sheet gesture).
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onDragStart = (e: React.PointerEvent) => {
    if (!dismissible || window.matchMedia("(min-width: 640px)").matches || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onDragEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    const fast = d.dy > 30 && d.dy / Math.max(1, e.timeStamp - d.t) > 0.6;
    if (d.dy > 110 || fast) onClose();
    else if (reducedMotion()) panel.current.style.transform = "";
    else gsap.to(panel.current, { y: 0, duration: 0.25, ease: "power3.out", clearProps: "transform" });
  };

  if (!visible) return null;

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6" onKeyDown={onKey} role="presentation">
      <div ref={backdrop} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => dismissible && onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised shadow-lg sm:rounded-2xl",
          widths[size],
        )}
      >
        <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} className="shrink-0 max-sm:touch-none" data-testid="sheet-grabber">
        <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-4 pt-2 sm:px-6 sm:pt-4">
          <div>
            <h2 className="text-heading font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-meta text-muted">{description}</p>}
          </div>
          {dismissible && (
            <IconButton label="Close" size="sm" onClick={onClose} className="-mr-2 -mt-1">
              <X className="size-5" aria-hidden />
            </IconButton>
          )}
        </div>
        </div>
        <div className="overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Bottom sheet on phones, centred dialog from `sm` up. Same component; the name reads better at call sites. */
export const Sheet = Modal;

/**
 * Sticky action bar at the bottom of a sheet: on phones the primary action is full width in the thumb zone.
 * Pass only the primary (and an optional destructive/secondary) action; the header × already cancels.
 */
export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "sticky -bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] mt-5 flex flex-col-reverse gap-2 border-t border-border bg-surface-raised px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:static sm:-mx-6 sm:mb-[-1.25rem] sm:flex-row sm:justify-end sm:px-6 sm:pb-4 [&>*]:max-sm:w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
