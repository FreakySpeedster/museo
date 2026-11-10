"use client";

import clsx from "clsx";
import { AlertCircle, Check, Info, X, type LucideIcon } from "lucide-react";
import { createContext, createElement, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, reducedMotion } from "@/lib/gsap";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; kind: Kind; message: string }
interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}

const ICON: Record<Kind, LucideIcon> = { success: Check, error: AlertCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    const el = document.querySelector<HTMLElement>(`[data-toast="${id}"]`);
    const remove = () => setItems((xs) => xs.filter((x) => x.id !== id));
    if (!el || reducedMotion()) return remove();
    gsap.to(el, { y: 20, opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in", onComplete: remove });
  }, []);

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-toast="${id}"]`);
        if (el && !reducedMotion()) gsap.fromTo(el, { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" });
      });
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m) }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] flex flex-col items-center sm:bottom-4 sm:top-auto gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            data-toast={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-2xl"
          >
            <span
              className={clsx(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                t.kind === "success" && "bg-emerald-500",
                t.kind === "error" && "bg-red-500",
                t.kind === "info" && "bg-sky-500",
              )}
            >
              {createElement(ICON[t.kind], { className: "size-3.5", "aria-hidden": true, strokeWidth: 3 })}
            </span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
