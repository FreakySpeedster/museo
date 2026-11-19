import clsx from "clsx";
import type { PublicUser } from "@/lib/dto";
import { Avatar } from "@/components/ui/Avatar";

/** Tiny overlapping faces + "Owned by N". */
export function OwnersStack({ users, total, size = 18, className, long }: { users: PublicUser[]; total: number; size?: number; className?: string; long?: boolean }) {
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1.5", className)} data-testid="owners">
      <span className="flex shrink-0 -space-x-1.5">
        {users.slice(0, 3).map((u) => (
          <Avatar key={u.id} name={u.displayName} username={u.username} avatarUrl={u.avatarUrl} size={size} className="ring-2 ring-background" />
        ))}
      </span>
      <span className="truncate">
        {long ? (
          <>Owned by <span className="font-semibold text-foreground">{total.toLocaleString("en-US")}</span> {total === 1 ? "person" : "people"}</>
        ) : (
          <>Owned by {total.toLocaleString("en-US")}</>
        )}
      </span>
    </span>
  );
}
