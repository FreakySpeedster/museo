"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const getDark = () => document.documentElement.classList.contains("dark");

/** `icon` = round icon button; `row` = sidebar row (icon + label at lg, icon only on the rail). */
export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const dark = useSyncExternalStore(subscribe, getDark, () => false);
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }
  const Icon = dark ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={clsx(
        variant === "row"
          ? "flex h-12 w-full items-center justify-center gap-4 rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink lg:justify-start lg:px-3"
          : "grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Icon className="size-6 shrink-0" aria-hidden strokeWidth={1.8} />
      {variant === "row" && <span className="hidden text-[15px] lg:inline">{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
