import clsx from "clsx";
import Link from "next/link";
import type { TrendingCollection } from "@/lib/services/discovery";
import { categoryMeta } from "@/lib/categories";
import { plural } from "@/lib/plural";
import { Avatar } from "@/components/ui/Avatar";
import { UserName } from "@/components/ui/UserName";
import { ItemThumb } from "@/components/profile/ItemThumb";

export const collectionHref = (c: Pick<TrendingCollection, "owner" | "pageId">) => `/u/${c.owner.username}?page=${c.pageId}`;

/** A collection as a cover mosaic (one hero + two), its name, owner and size. */
export function CollectionCard({ c, className, eager }: { c: TrendingCollection; className?: string; eager?: boolean }) {
  const [hero, ...rest] = c.covers;
  const hint = { category: c.category, collection: c.name };
  return (
    <article className={clsx("group relative min-w-0", className)} data-testid="collection-card">
      <div className="grid aspect-[4/3] grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-surface-hover">
        <div className={clsx("relative", rest.length ? "col-span-2 row-span-2" : "col-span-3 row-span-2")}>
          {hero && <ItemThumb item={hero} hint={hint} eager={eager} className="transition-transform duration-300 group-hover:scale-[1.03]" />}
        </div>
        {rest.slice(0, 2).map((it) => (
          <div key={it.id} className={clsx("relative", rest.length === 1 && "row-span-2")}>
            <ItemThumb item={it} hint={hint} />
          </div>
        ))}
      </div>
      {c.newThisWeek > 0 && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-micro font-semibold text-white backdrop-blur">
          +{c.newThisWeek} this week
        </span>
      )}
      <h3 className="mt-2 truncate text-meta font-semibold leading-snug">
        {/* Whole card is the link (stretched); the owner link below sits above it. */}
        <Link href={collectionHref(c)} className="after:absolute after:inset-0 after:content-['']">{c.name}</Link>
      </h3>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-muted">
        <Avatar name={c.owner.displayName} username={c.owner.username} avatarUrl={c.owner.avatarUrl} size={16} className="shrink-0" />
        <span className="relative z-10 min-w-0">
          <UserName user={c.owner} label="username" size="sm" nameClassName="text-caption" className="min-w-0" />
        </span>
        <span aria-hidden>·</span>
        <span className="shrink-0 tabular-nums">{c.itemCount} {plural("item", c.itemCount)}</span>
      </div>
      <span className="sr-only">{categoryMeta(c.category).label}</span>
    </article>
  );
}
