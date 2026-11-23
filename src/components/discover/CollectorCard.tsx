import clsx from "clsx";
import Link from "next/link";
import type { SuggestedCollector } from "@/lib/services/discovery";
import { Avatar } from "@/components/ui/Avatar";
import { UserName } from "@/components/ui/UserName";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { FollowPill } from "./FollowPill";

/** "People you might like" card: three recent finds, the face, why we suggest them, and Follow. */
export function CollectorCard({ s, signedIn, className }: { s: SuggestedCollector; signedIn: boolean; className?: string }) {
  const u = s.user;
  return (
    <article className={clsx("relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border border-border bg-surface pb-3 text-center", className)} data-testid="collector-card">
      <div className="grid h-20 w-full grid-cols-3 gap-px bg-surface-hover" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative overflow-hidden">{s.covers[i] && <ItemThumb item={s.covers[i]} />}</div>
        ))}
      </div>
      <Link href={`/u/${u.username}`} className="-mt-7 rounded-full after:absolute after:inset-0 after:content-['']" aria-label={`${u.displayName}, @${u.username}`}>
        <span className="relative block rounded-full">
          <Avatar name={u.displayName} username={u.username} avatarUrl={u.avatarUrl} size={56} className="ring-[3px] ring-surface" />
        </span>
      </Link>
      <div className="mt-1.5 w-full min-w-0 px-3">
        <UserName user={u} href={false} interactive={false} nameClassName="text-meta font-semibold" className="justify-center" />
        <p className="truncate text-caption text-muted">@{u.username}</p>
        <p className="mt-1 line-clamp-2 min-h-[2.5em] text-caption leading-snug text-muted">{s.reason}</p>
      </div>
      <div className="relative z-10 mt-2">
        <FollowPill username={u.username} displayName={u.displayName} initial={s.followState} signedIn={signedIn} />
      </div>
    </article>
  );
}
