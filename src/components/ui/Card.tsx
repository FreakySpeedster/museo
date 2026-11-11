import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  children,
  padded = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; padded?: boolean }) {
  return (
    <div
      className={clsx("rounded-2xl border border-border bg-surface shadow-md", padded && "p-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
