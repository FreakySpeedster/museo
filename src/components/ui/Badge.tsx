import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "accent" | "neutral" | "success" | "warning";

const tones: Record<Tone, string> = {
  accent: "bg-accent text-accent-contrast",
  neutral: "bg-surface-hover text-muted",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
};

export function Badge({ tone = "accent", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}
