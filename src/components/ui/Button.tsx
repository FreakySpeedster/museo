import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-[color,background-color,border-color,filter,transform] active:scale-[0.97] motion-reduce:active:scale-100 duration-[var(--duration-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-pressed",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "bg-danger text-danger-contrast hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "btn-sm h-8 px-3.5 text-meta",
  md: "h-11 px-5 text-meta",
  lg: "h-12 px-6 text-body",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; children?: ReactNode }) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      data-hit={size !== "lg" ? "compact" : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={buttonClass(variant, size, className)} data-hit={size !== "lg" ? "compact" : undefined}>
      {children}
    </Link>
  );
}
