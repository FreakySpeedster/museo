import clsx from "clsx";
import type { ReactNode } from "react";

export function Tabs<T extends string>({
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
    <div role="tablist" aria-label={label} className={clsx(spread ? "flex w-full" : "inline-flex", "rounded-full border border-border bg-surface p-1", className)}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            data-hit="compact"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "inline-flex h-8 items-center justify-center gap-2 rounded-full px-4 text-meta font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
              spread && "flex-1",
              on ? "bg-foreground text-background shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
