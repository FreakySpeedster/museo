"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Sheet } from "./Modal";

/** Pick one option from a bottom sheet (iOS action-list style). Replaces dropdowns on phones. */
export function OptionSheet<T extends string>({
  open,
  onClose,
  title,
  value,
  options,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm">
      <ul role="radiogroup" aria-label={title} className="-mx-2">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              role="radio"
              aria-checked={value === o.value}
              onClick={() => {
                onChange(o.value);
                onClose();
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              {o.icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-hover">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">{o.label}</span>
                {o.description && <span className="block text-caption text-muted">{o.description}</span>}
              </span>
              {value === o.value && <Check className="size-5 shrink-0" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
