import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const controlClass =
  "control w-full rounded-md border border-border bg-surface text-foreground disabled:opacity-60";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-meta font-medium text-foreground">
        <span>{label}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </label>
      {children}
      {error && <FormError>{error}</FormError>}
    </div>
  );
}

export function FormError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={clsx("rounded-md bg-danger-subtle px-3 py-2 text-meta text-danger", className)}>
      {children}
    </p>
  );
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(controlClass, className)} {...p} />;
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(controlClass, "min-h-24 resize-y", className)} {...p} />;
}
