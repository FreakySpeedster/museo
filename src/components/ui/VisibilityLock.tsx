import { Lock } from "lucide-react";

export function VisibilityLock({ label = "Private" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-caption text-muted" title={label}>
      <Lock className="size-3.5" aria-hidden strokeWidth={2.2} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
