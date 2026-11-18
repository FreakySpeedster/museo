"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
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

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea className={clsx(controlClass, "min-h-24 resize-y", className)} {...p} />;
}

/** Password field with a show / hide toggle (44px target inside the field). */
export function PasswordInput({ className, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...p} type={shown ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={clsx(controlClass, "pr-12", className)} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted hover:text-foreground"
      >
        {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
