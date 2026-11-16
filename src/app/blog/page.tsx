import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { NotebookPen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeConfigured } from "@/lib/env";
import { listPosts } from "@/lib/services/blog";
import { BlogFeed } from "@/components/blog/BlogFeed";
import { WritePostButton } from "@/components/blog/WritePostButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";

type Props = { searchParams: Promise<{ view?: string; author?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.author) return { title: `@${sp.author.toLowerCase()}'s blog`, description: `Reviews and stories by @${sp.author.toLowerCase()} on nook.` };
  return { title: "Blog", description: "Reviews and stories about the things people collect on nook." };
}

export default async function BlogPage({ searchParams }: Props) {
  const [sp, viewer] = await Promise.all([searchParams, getCurrentUser()]);
  const mine = sp.view === "mine";
  if (mine && !viewer) redirect("/login");
  const author = !mine && sp.author ? sp.author.toLowerCase().slice(0, 40) : undefined;
  const authorUser = author ? await db.user.findUnique({ where: { username: author }, select: { id: true, username: true, displayName: true, avatarUrl: true } }) : null;
  const { posts, nextCursor } = await listPosts({ mine, author, viewerId: viewer?.id });
  const plan = !viewer ? "guest" : viewer.subscribed ? "plus" : "free";
  const priceLabel = process.env.PLUS_PRICE_LABEL || "$4 / month";
  const write = <WritePostButton plan={plan} stripeEnabled={stripeConfigured()} priceLabel={priceLabel} />;
  const query = mine ? "mine=1" : author ? `author=${encodeURIComponent(author)}` : "";

  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={clsx("inline-flex h-8 items-center rounded-full px-4 text-meta font-medium transition-colors", on ? "bg-foreground text-background" : "text-muted hover:text-foreground")}>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {authorUser ? (
            <Link href={`/u/${authorUser.username}`} className="mb-3 flex w-fit items-center gap-2.5">
              <Avatar name={authorUser.displayName} username={authorUser.username} avatarUrl={authorUser.avatarUrl} size="sm" />
              <span className="text-meta text-muted">@{authorUser.username}</span>
            </Link>
          ) : null}
          <h1 className="text-title font-semibold tracking-tight">{authorUser ? `${authorUser.displayName}'s blog` : mine ? "Your posts" : "Blog"}</h1>
          <p className="mt-1 max-w-xl text-muted">
            {authorUser ? "Reviews and stories about the things they collect." : mine ? "Drafts stay private until you publish them." : "Reviews and stories about the things people collect, written by nook Plus members."}
          </p>
        </div>
        {(!authorUser || authorUser.id === viewer?.id) && write}
      </header>

      {!author && viewer && (
        <nav aria-label="Blog views" className="mt-6 inline-flex rounded-full border border-border bg-surface p-1">
          {tab("/blog", "Latest", !mine)}
          {tab("/blog?view=mine", "Your posts", mine)}
        </nav>
      )}

      <div className="mt-8">
        {posts.length === 0 ? (
          <EmptyState
            icon={<NotebookPen className="size-10" aria-hidden strokeWidth={1.5} />}
            title={mine ? "You haven't written anything yet" : authorUser ? "No posts yet" : author ? "No one by that name" : "No posts yet"}
            description={mine ? (plan === "plus" ? "Pick something from your collections and tell people what it's really like." : "Writing on your nook blog is part of nook Plus.") : "Check back soon."}
            action={mine ? write : undefined}
          />
        ) : (
          <BlogFeed key={query} initial={posts} initialCursor={nextCursor} query={query} showStatus={mine} />
        )}
      </div>
    </div>
  );
}
