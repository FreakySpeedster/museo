import clsx from "clsx";

/** Small numeric pill pinned to the top-right of an icon (position the parent `relative`). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={clsx(
        "pointer-events-none absolute -right-1.5 -top-1.5 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-danger px-1 text-[0.6875rem] font-semibold leading-none text-white ring-2 ring-[var(--background)] tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
