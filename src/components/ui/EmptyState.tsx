import clsx from "clsx";
import type { ReactNode } from "react";

/** The one empty state: a soft icon tile, a title, one line of help and an optional action. No box around it. */
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
    <div className={clsx("flex flex-col items-center px-4 py-14 text-center", className)} data-testid="empty-state">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-hover text-foreground [&_svg]:size-6">{icon}</span>
      <h3 className="mt-4 text-body font-semibold">{title}</h3>
      {description && <div className="mt-1 max-w-xs text-meta text-muted">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
