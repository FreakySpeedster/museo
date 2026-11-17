import type { ReactNode } from "react";
import { Card } from "../ui/Card";

/** Centered card shell shared by the account recovery screens. */
export function AuthCard({ icon, title, description, children }: { icon?: ReactNode; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--chrome-top))] max-w-md flex-col justify-center px-4 py-10">
      <Card className="p-6 sm:p-8">
        {icon && <span className="mb-5 grid size-11 place-items-center rounded-full bg-surface-hover text-foreground">{icon}</span>}
        <h1 className="text-title font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-meta text-muted">{description}</p>}
        {children}
      </Card>
    </div>
  );
}
