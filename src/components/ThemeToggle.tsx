"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("museo:theme", cb);
  return () => {
    obs.disconnect();
    window.removeEventListener("museo:theme", cb);
  };
}
const getDark = () => document.documentElement.classList.contains("dark");

export type ThemeMode = "light" | "dark" | "system";

function readMode(): ThemeMode {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Light, dark, or follow the device. "system" clears the stored choice (the boot script then reads prefers-color-scheme). */
export function applyTheme(mode: ThemeMode) {
  const dark = mode === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : mode === "dark";
  try {
    if (mode === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", mode);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event("museo:theme"));
}

/** Current theme mode; re-reads whenever the `dark` class flips. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, readMode, () => "system");
}

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
