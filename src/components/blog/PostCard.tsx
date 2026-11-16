import Link from "next/link";
import { Layers, NotebookPen } from "lucide-react";
import type { BlogPostSummaryDTO } from "@/lib/dto";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export const postDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function PostCard({ post, showStatus = false }: { post: BlogPostSummaryDTO; showStatus?: boolean }) {
  const href = showStatus && post.status === "draft" ? `/blog/${post.id}/edit` : `/blog/${post.id}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface transition-shadow hover:shadow-lg" data-testid="post-card">
      <div className="aspect-[16/9] overflow-hidden bg-surface-hover">
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center bg-accent-subtle/60">
            <NotebookPen className="size-9 text-accent" aria-hidden strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {showStatus && (
          <div className="mb-2"><Badge tone={post.status === "published" ? "success" : "neutral"}>{post.status === "published" ? "Published" : "Draft"}</Badge></div>
        )}
        <h2 className="line-clamp-2 text-lede font-semibold leading-snug tracking-tight">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">{post.title}</Link>
        </h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-meta text-muted">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-2 pt-4 text-caption text-muted">
          <Avatar name={post.author.displayName} username={post.author.username} avatarUrl={post.author.avatarUrl} size={22} />
          <span className="truncate font-medium text-foreground">{post.author.displayName}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt ?? post.updatedAt}>{postDate(post.publishedAt ?? post.updatedAt)}</time>
          {post.itemCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1" title={`${post.itemCount} tagged ${post.itemCount === 1 ? "item" : "items"}`}>
              <Layers className="size-3.5" aria-hidden /> {post.itemCount}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
