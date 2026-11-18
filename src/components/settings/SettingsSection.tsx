import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** iOS-style grouped list: a small caption above a rounded group of rows. Add new groups as the app grows. */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      {title && <h2 className="mb-1.5 px-4 text-caption font-medium uppercase tracking-wide text-muted">{title}</h2>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-caption text-muted">{footer}</p>}
    </section>
  );
}

/**
 * One row: icon tile, label, optional current value, chevron when it leads somewhere.
 * Give `href` for navigation or `onClick` for a sheet; neither makes a read-only row.
 */
export function SettingsRow({
  icon,
  label,
  value,
  href,
  onClick,
  danger,
  testId,
}: {
  icon?: ReactNode;
  label: string;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  testId?: string;
}) {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      {icon && <span className={clsx("grid size-8 shrink-0 place-items-center rounded-lg", danger ? "bg-danger-subtle text-danger" : "bg-surface-hover text-foreground")}>{icon}</span>}
      <span className={clsx("min-w-0 flex-1 truncate text-body", danger && "font-medium text-danger")}>{label}</span>
      {value !== undefined && <span className="min-w-0 max-w-[50%] truncate text-meta text-muted">{value}</span>}
      {interactive && !danger && <ChevronRight className="size-5 shrink-0 text-muted/70" aria-hidden />}
    </>
  );
  const cls = clsx("flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left", interactive && "transition-colors hover:bg-surface-hover active:bg-surface-hover");
  if (href) return <Link href={href} className={cls} data-testid={testId}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls} data-testid={testId}>{body}</button>;
  return <div className={cls} data-testid={testId}>{body}</div>;
}
