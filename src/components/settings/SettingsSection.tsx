import type { ReactNode } from "react";

/** A titled group of settings. Add new groups (Notifications, Account…) as more sections. */
export function SettingsSection({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface" aria-labelledby={`settings-${title}`}>
      <header className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
        {icon && <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-hover text-foreground">{icon}</span>}
        <div>
          <h2 id={`settings-${title}`} className="text-heading font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-meta text-muted">{description}</p>}
        </div>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

/** One setting: label and help on the left, its control on the right (stacks on phones). */
export function SettingRow({ label, description, htmlFor, children }: { label: string; description?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-meta font-medium text-foreground">{label}</label>
        {description && <div className="mt-0.5 text-caption text-muted">{description}</div>}
      </div>
      <div className="w-full shrink-0 sm:w-64">{children}</div>
    </div>
  );
}
