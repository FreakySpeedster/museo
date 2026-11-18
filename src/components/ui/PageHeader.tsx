import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The one page title block: same size, spacing and gutters on every top-level screen.
 * `eyebrow` sits above the title (e.g. "Welcome back"); `action` aligns right on the title row.
 * For pushed screens with a back arrow use `PhoneHeader` (components/ui/PushedScreen).
 */
export function PageHeader({ title, description, eyebrow, action, className }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={clsx("mb-6 flex items-end justify-between gap-4 pt-5 md:mb-8 md:pt-12", className)} data-testid="page-header">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-meta text-muted">{eyebrow}</p>}
        <h1 className="text-title font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-meta text-muted md:text-body">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
