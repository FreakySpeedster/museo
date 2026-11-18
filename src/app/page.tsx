import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { followingFeed, globalFeed } from "@/lib/services/feed";
import { Landing } from "@/components/landing/Landing";
import { PageHeader } from "@/components/ui/PageHeader";
import { HomeFeed } from "@/components/feed/HomeFeed";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const followCount = await db.follow.count({ where: { followerId: user.id } });
  const scope = followCount > 0 ? "following" : "global";
  const initial = scope === "following" ? await followingFeed(user.id) : await globalFeed(undefined, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
      <PageHeader eyebrow="Welcome back" title={`Hi ${user.displayName.split(" ")[0]}`} description="Here’s what’s new across nook." className="!mb-3 md:!mb-4" />
      <HomeFeed initialScope={scope} initial={initial} hasFollows={followCount > 0} viewerId={user.id} />
    </div>
  );
}
