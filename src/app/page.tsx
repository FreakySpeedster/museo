import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { followingFeed } from "@/lib/services/feed";
import { exploreChips } from "@/lib/services/explore";
import { Landing } from "@/components/landing/Landing";
import { PageHeader } from "@/components/ui/PageHeader";
import { HomeFeed } from "@/components/feed/HomeFeed";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const [followCount, sp, { chips }] = await Promise.all([db.follow.count({ where: { followerId: user.id } }), searchParams, exploreChips(user.id)]);
  const scope = sp.tab === "explore" || followCount === 0 ? "explore" : "following";
  const initial = scope === "following" ? await followingFeed(user.id) : { items: [], nextCursor: null };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
      <PageHeader eyebrow="Welcome back" title={`Hi ${user.displayName.split(" ")[0]}`} description="Here’s what’s new across nook." className="!mb-3 md:!mb-4" />
      <HomeFeed initialScope={scope} initial={initial} hasFollows={followCount > 0} viewerId={user.id} chips={chips} />
    </div>
  );
}
