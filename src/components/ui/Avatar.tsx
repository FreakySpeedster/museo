import clsx from "clsx";

const GRADIENTS = [
  ["#ff5a2c", "#ffb020"], ["#7c3aed", "#ec4899"], ["#0ea5e9", "#22c55e"], ["#f43f5e", "#f59e0b"],
  ["#14b8a6", "#6366f1"], ["#84cc16", "#06b6d4"], ["#d946ef", "#3b82f6"], ["#ef4444", "#f97316"],
];

export function Avatar({ name, username, avatarUrl, size = 36, className }: { name: string; username: string; avatarUrl?: string | null; size?: number; className?: string }) {
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className={clsx("inline-block shrink-0 rounded-full bg-surface-2 object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {(name || username).trim().charAt(0).toUpperCase()}
    </span>
  );
}
