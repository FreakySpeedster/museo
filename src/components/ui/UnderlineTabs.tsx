import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Page-level section tabs (Instagram profile style): equal columns, icon + label, an underline marks the active one. */
export function UnderlineTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: LucideIcon }>;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={clsx("flex border-y border-border", className)}>
      {options.map((opt) => {
        const on = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            data-testid={`tab-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "relative flex h-12 flex-1 items-center justify-center gap-2 text-meta transition-colors",
              on ? "font-semibold text-foreground" : "font-medium text-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-[18px]" aria-hidden strokeWidth={on ? 2.3 : 1.8} />}
            {opt.label}
            <span aria-hidden className={clsx("absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-foreground transition-opacity sm:inset-x-[30%]", on ? "opacity-100" : "opacity-0")} />
          </button>
        );
      })}
    </div>
  );
}
