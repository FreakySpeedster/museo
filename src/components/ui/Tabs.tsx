import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Page-level tabs (Instagram / X style): equal columns, optional icon, an underline marks the active one.
 * Options with `href` render as links (server-routed tabs such as the blog's Latest / Your posts).
 * `sticky` pins the bar under the phone top bar.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  sticky = false,
}: {
  value: T;
  onChange?: (value: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: LucideIcon; href?: string }>;
  label: string;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx("flex border-b border-border", sticky && "glass sticky top-[var(--chrome-top)] z-30 tabs-sticky", className)}
    >
      {options.map((opt) => {
        const on = value === opt.value;
        const Icon = opt.icon;
        const cls = clsx(
          "relative flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 text-meta transition-colors",
          on ? "font-semibold text-foreground" : "font-medium text-muted hover:text-foreground",
        );
        const body = (
          <>
            {Icon && <Icon className="size-[18px]" aria-hidden strokeWidth={on ? 2.2 : 1.75} />}
            {opt.label}
            <span aria-hidden className={clsx("absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-foreground transition-opacity sm:inset-x-[28%]", on ? "opacity-100" : "opacity-0")} />
          </>
        );
        return opt.href ? (
          <Link key={opt.value} href={opt.href} role="tab" aria-selected={on} data-testid={`tab-${opt.value}`} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={opt.value} type="button" role="tab" aria-selected={on} data-testid={`tab-${opt.value}`} onClick={() => onChange?.(opt.value)} className={cls}>
            {body}
          </button>
        );
      })}
    </div>
  );
}

/** In-form choice (pill segmented control): Link / Photo, Light / Dark / Auto, Your items / All of Museo. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  spread = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  label: string;
  className?: string;
  spread?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx(spread ? "flex w-full" : "inline-flex", "rounded-full bg-surface-hover p-1", className)}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-meta font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
              spread && "flex-1",
              on ? "bg-surface-raised text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
