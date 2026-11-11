import clsx from "clsx";

const GRADIENTS = [
  ["#c83819", "#c48a1a"], ["#7c3aed", "#ec4899"], ["#0ea5e9", "#22c55e"], ["#f43f5e", "#f59e0b"],
  ["#14b8a6", "#6366f1"], ["#84cc16", "#06b6d4"], ["#d946ef", "#3b82f6"], ["#ef4444", "#f97316"],
];

export const AVATAR_SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 88, "2xl": 160 } as const;
export type AvatarSize = keyof typeof AVATAR_SIZES | number;

function resolve(size: AvatarSize): number {
  return typeof size === "number" ? size : AVATAR_SIZES[size];
}

export function Avatar({ name, username, avatarUrl, size = "md", className }: { name: string; username: string; avatarUrl?: string | null; size?: AvatarSize; className?: string }) {
  const px = resolve(size);
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={px}
        height={px}
        draggable={false}
        className={clsx("inline-block shrink-0 rounded-full bg-surface-hover object-cover", className)}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: px, height: px, fontSize: px * 0.4, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {(name || username).trim().charAt(0).toUpperCase()}
    </span>
  );
}
