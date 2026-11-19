import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getPost } from "@/lib/services/blog";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { ItemThumbMini } from "@/components/blog/ItemTagPicker";
import { postDate } from "@/components/blog/PostCard";
import { SharePostButton } from "@/components/blog/SharePostButton";

type Props = { params: Promise<{ id: string }> };

async function load(id: string, viewerId?: string | null) {
  try {
    return await getPost(id, viewerId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, viewer] = await Promise.all([params, getCurrentUser()]);
  const post = await load(id, viewer?.id);
  if (!post) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: post.title,
    description: post.excerpt || `A post by ${post.author.displayName} on Museo`,
    robots: post.status === "draft" ? { index: false } : undefined,
    openGraph: { type: "article", title: post.title, description: post.excerpt, images: post.coverUrl && post.coverUrl.startsWith("https://") ? [post.coverUrl] : undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const [{ id }, viewer] = await Promise.all([params, getCurrentUser()]);
  const post = await load(id, viewer?.id);
  if (!post) notFound();
  const isAuthor = viewer?.id === post.author.id;
  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link href={`/blog?author=${post.author.username}`} className="inline-flex items-center gap-1.5 text-meta text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {post.author.displayName}&apos;s blog
        </Link>
        <div className="flex items-center gap-2">
          {post.status === "draft" && <Badge tone="neutral">Draft</Badge>}
          {post.status === "published" && <SharePostButton title={post.title} />}
          {isAuthor && (
            <Link href={`/blog/${post.id}/edit`} className={buttonClass("secondary", "sm")}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Link>
          )}
        </div>
      </div>

      <header>
        <h1 className="text-balance text-title font-semibold leading-tight tracking-tight">{post.title}</h1>
        <Link href={`/u/${post.author.username}`} className="mt-6 flex w-fit items-center gap-3">
          <Avatar name={post.author.displayName} username={post.author.username} avatarUrl={post.author.avatarUrl} size="md" />
          <span>
            <span className="block text-meta font-semibold">{post.author.displayName}</span>
            <span className="block text-caption text-muted">
              @{post.author.username}
              {post.publishedAt && <> · <time dateTime={post.publishedAt}>{postDate(post.publishedAt)}</time></>}
            </span>
          </span>
        </Link>
      </header>

      <div className="prose-museo mt-10" data-testid="post-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

      {post.items.length > 0 && (
        <section className="mt-14 border-t border-border pt-8" aria-labelledby="tagged-heading">
          <h2 id="tagged-heading" className="text-heading font-semibold tracking-tight">Items in this post</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {post.items.map((it) => (
              <li key={it.id}>
                <Link href={`/i/${it.id}`} className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-surface-hover">
                  <ItemThumbMini item={it} className="size-14 rounded-xl" />
                  <span className="min-w-0">
                    <span className="block truncate text-meta font-semibold">{it.title}</span>
                    <span className="block truncate text-caption text-muted">{it.collection} · @{it.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
