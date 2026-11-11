import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Button";

type Size = "sm" | "md" | "lg";
type Variant = "ghost" | "secondary" | "danger";

const sizes: Record<Size, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const variants: Record<Variant, string> = {
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-hover",
  danger: "text-danger hover:bg-danger-subtle",
};

export function IconButton({
  size = "md",
  variant = "ghost",
  loading,
  label,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: Size;
  variant?: Variant;
  loading?: boolean;
  label: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-hit={size !== "lg" ? "compact" : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-grid shrink-0 place-items-center rounded-full transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
