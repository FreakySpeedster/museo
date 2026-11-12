"use client";

import clsx from "clsx";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "inline-flex items-center gap-3 text-meta font-medium",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={clsx(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-foreground" : "bg-border",
        )}
        aria-hidden
      >
        <span
          className={clsx(
            "absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
