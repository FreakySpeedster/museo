import clsx from "clsx";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("grid place-items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center", className)}>
      <div className="text-accent">{icon}</div>
      <h3 className="mt-3 text-heading font-semibold tracking-tight">{title}</h3>
      {description && <div className="mt-1 max-w-sm text-meta text-muted">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
