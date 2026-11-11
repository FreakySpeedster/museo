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

/** `icon` = round icon button; `row` = sidebar row (icon in a fixed slot, label revealed when the rail is open). */
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
  const label = dark ? "Light mode" : "Dark mode";
  if (variant === "row") {
    return (
      <button
        onClick={toggle}
        aria-label={label}
        title={label}
        className={clsx("nav-row text-muted hover:bg-surface-hover hover:text-foreground", className)}
      >
        <span className="nav-icon-slot">
          <Icon className="nav-icon" aria-hidden strokeWidth={1.8} />
        </span>
        <span className="nav-label whitespace-nowrap pr-3 text-meta">{label}</span>
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      data-hit="compact"
      className={clsx("grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground", className)}
    >
      <Icon className="size-5" aria-hidden strokeWidth={1.8} />
    </button>
  );
}
