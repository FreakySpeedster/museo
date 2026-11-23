import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeConfigured } from "@/lib/env";
import { listPosts } from "@/lib/services/blog";
import { BlogFeed } from "@/components/blog/BlogFeed";
import { WritePostButton } from "@/components/blog/WritePostButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { PlusSeal } from "@/components/ui/PlusSeal";

type Props = { searchParams: Promise<{ view?: string; author?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.author) return { title: `@${sp.author.toLowerCase()}'s blog`, description: `Reviews and stories by @${sp.author.toLowerCase()} on Museo.` };
  return { title: "Blog", description: "Reviews and stories about the things people collect on Museo." };
}

export default async function BlogPage({ searchParams }: Props) {
  const [sp, viewer] = await Promise.all([searchParams, getCurrentUser()]);
  const mine = sp.view === "mine";
  if (mine && !viewer) redirect("/login");
  const author = !mine && sp.author ? sp.author.toLowerCase().slice(0, 40) : undefined;
  const authorUser = author ? await db.user.findUnique({ where: { username: author }, select: { id: true, username: true, displayName: true, avatarUrl: true, subscribed: true } }) : null;
  const { posts, nextCursor } = await listPosts({ mine, author, viewerId: viewer?.id });
  const plan = !viewer ? "guest" : viewer.subscribed ? "plus" : "free";
  const priceLabel = process.env.PLUS_PRICE_LABEL || "$4 / month";
  const write = <WritePostButton plan={plan} stripeEnabled={stripeConfigured()} priceLabel={priceLabel} />;
  const query = mine ? "mine=1" : author ? `author=${encodeURIComponent(author)}` : "";


  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-5 md:mb-8 md:pt-12">
        <div className="min-w-0">
          {authorUser ? (
            <div className="mb-3 flex w-fit items-center gap-2.5">
              <Link href={`/u/${authorUser.username}`} className="shrink-0 rounded-full">
                <Avatar name={authorUser.displayName} username={authorUser.username} avatarUrl={authorUser.avatarUrl} size="sm" />
              </Link>
              <span className="text-meta text-muted">@{authorUser.username}</span>
            </div>
          ) : null}
          <h1 className="flex items-center gap-2 text-title font-semibold tracking-tight">
            {authorUser ? (
              <>
                <span className="min-w-0 truncate">{authorUser.displayName}&apos;s blog</span>
                {authorUser.subscribed ? <PlusSeal size="lg" /> : null}
              </>
            ) : mine ? "Your posts" : "Blog"}
          </h1>
          <p className="mt-1 max-w-xl text-meta text-muted md:text-body">
            {authorUser ? "Reviews and stories about the things they collect." : mine ? "Drafts stay private until you publish them." : "Reviews and stories about the things people collect, written by Museo Plus members."}
          </p>
        </div>
        {viewer && (!authorUser || authorUser.id === viewer.id) && write}
      </header>

      {!author && viewer && (
        <Tabs
          label="Blog views"
          className="-mx-4 -mt-2 sm:-mx-6"
          value={mine ? "mine" : "latest"}
          options={[
            { value: "latest", label: "Latest", href: "/blog" },
            { value: "mine", label: "Your posts", href: "/blog?view=mine" },
          ]}
        />
      )}

      <div className="mt-6">
        {posts.length === 0 ? (
          <EmptyState
            icon={<NotebookPen aria-hidden />}
            title={mine ? "You haven't written anything yet" : authorUser ? "No posts yet" : author ? "No one by that name" : "The first stories are on their way"}
            description={
              mine
                ? plan === "plus" ? "Pick something from your collections and tell people what it's really like." : "Writing on your Museo blog is part of Museo Plus."
                : authorUser ? "Published reviews and stories will show up here."
                : !viewer ? "Museo members write reviews of the things they collect. Browse collections while you wait."
                : "Reviews from Museo Plus members will appear here. Yours could be first."
            }
            action={mine ? write : !viewer ? <LinkButton href="/signup">Start your Museo, free</LinkButton> : plan === "plus" && !authorUser ? write : undefined}
          />
        ) : (
          <BlogFeed key={query} initial={posts} initialCursor={nextCursor} query={query} showStatus={mine} />
        )}
      </div>
    </div>
  );
}
