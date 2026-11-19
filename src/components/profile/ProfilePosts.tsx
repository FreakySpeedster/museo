"use client";

import { NotebookPen, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import type { BlogPostSummaryDTO } from "@/lib/dto";
import { api } from "@/lib/client";
import { BlogFeed } from "@/components/blog/BlogFeed";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Profile "Posts" tab: the user's published blog posts. */
export function ProfilePosts({ username, isOwner, subscribed }: { username: string; isOwner: boolean; subscribed: boolean }) {
  const [data, setData] = useState<{ posts: BlogPostSummaryDTO[]; nextCursor: string | null } | null>(null);
  const query = `author=${encodeURIComponent(username)}`;

  useEffect(() => {
    let live = true;
    api<{ posts: BlogPostSummaryDTO[]; nextCursor: string | null }>(`/api/blog/posts?${query}`)
      .then((r) => live && setData(r))
      .catch(() => live && setData({ posts: [], nextCursor: null }));
    return () => {
      live = false;
    };
  }, [query]);

  return (
    <div className="mt-6" data-testid="profile-posts">
      {data === null ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{[0, 1].map((i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}</div>
      ) : data.posts.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-10" aria-hidden strokeWidth={1.5} />}
          title={isOwner ? "Write your first post" : "No posts yet"}
          description={isOwner ? (subscribed ? "Review something you love and tag the items it's about." : "The blog is part of Museo Plus: write reviews that show up on the items you tag.") : "Published posts will show up here."}
          action={isOwner ? (subscribed ? <LinkButton href="/blog/new"><PenLine className="size-4" aria-hidden /> Write a post</LinkButton> : <LinkButton href="/pricing">See Museo Plus</LinkButton>) : undefined}
        />
      ) : (
        <BlogFeed initial={data.posts} initialCursor={data.nextCursor} query={query} />
      )}
    </div>
  );
}
