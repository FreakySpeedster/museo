"use client";

import Link from "next/link";
import { ChevronRight, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import type { BlogPostSummaryDTO } from "@/lib/dto";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";

/** "Read about it": published blog posts that tag this item. Renders nothing when there are none. */
export function ItemBlogPosts({ itemId }: { itemId: string }) {
  const [posts, setPosts] = useState<BlogPostSummaryDTO[]>([]);
  useEffect(() => {
    let live = true;
    api<{ posts: BlogPostSummaryDTO[] }>(`/api/items/${itemId}/posts`)
      .then((r) => live && setPosts(r.posts))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [itemId]);
  if (!posts.length) return null;
  return (
    <section className="mt-5 border-t border-border pt-5" data-testid="item-blog-posts" aria-labelledby={`posts-${itemId}`}>
      <h4 id={`posts-${itemId}`} className="flex items-center gap-2 text-meta font-semibold">
        <NotebookPen className="size-4 text-accent" aria-hidden /> Read about it
      </h4>
      <ul className="mt-3 space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/blog/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-surface-hover">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-meta font-semibold group-hover:underline">{p.title}</p>
                {p.excerpt && <p className="mt-0.5 line-clamp-2 text-caption text-muted">{p.excerpt}</p>}
                <p className="mt-1.5 flex items-center gap-1.5 text-micro text-muted">
                  <Avatar name={p.author.displayName} username={p.author.username} avatarUrl={p.author.avatarUrl} size={16} />
                  {p.author.displayName}
                  {p.publishedAt && <> · {timeAgo(p.publishedAt)}</>}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
