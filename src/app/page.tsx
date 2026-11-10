import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { followingFeed, globalFeed } from "@/lib/services/feed";
import { Landing } from "@/components/landing/Landing";
import { HomeFeed } from "@/components/feed/HomeFeed";
import { LinkButton } from "@/components/ui/Button";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const followCount = await db.follow.count({ where: { followerId: user.id } });
  const scope = followCount > 0 ? "following" : "global";
  const initial = scope === "following" ? await followingFeed(user.id) : await globalFeed();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hi {user.displayName.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-muted">Here’s what’s new on the shelves.</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/u/${user.username}?tab=timeline`} variant="secondary">My timeline</LinkButton>
          <LinkButton href={`/u/${user.username}`}>My shelves</LinkButton>
        </div>
      </div>
      <HomeFeed initialScope={scope} initial={initial} hasFollows={followCount > 0} />
    </div>
  );
}
