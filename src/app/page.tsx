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
  const initial = scope === "following" ? await followingFeed(user.id) : await globalFeed(undefined, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-meta text-muted">Welcome back</p>
          <h1 className="text-title font-semibold">Hi {user.displayName.split(" ")[0]}</h1>
          <p className="mt-1 text-body text-muted">Here’s what’s new across nook.</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/u/${user.username}`}>My collections</LinkButton>
        </div>
      </div>
      <HomeFeed initialScope={scope} initial={initial} hasFollows={followCount > 0} viewerId={user.id} />
    </div>
  );
}
