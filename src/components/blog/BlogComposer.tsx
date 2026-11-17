"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BlogStatus, TaggedItemDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormError } from "@/components/ui/Field";
import { PhoneHeader, useBack } from "@/components/ui/PushedScreen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/profile/dialogs";
import { ItemTagPicker } from "./ItemTagPicker";

// Tiptap is client-only and fairly large: load it on the composer route only.
const BlogEditor = dynamic(() => import("./BlogEditor").then((m) => m.BlogEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-3xl" />,
});

export interface ComposerPost {
  id: string;
  title: string;
  contentHtml: string;
  status: BlogStatus;
  items: TaggedItemDTO[];
}

export function BlogComposer({ post, initialItems = [] }: { post?: ComposerPost; initialItems?: TaggedItemDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(post?.title ?? "");
  const [html, setHtml] = useState(post?.contentHtml ?? "");
  const [items, setItems] = useState<TaggedItemDTO[]>(post?.items ?? initialItems);
  const [busy, setBusy] = useState<"" | BlogStatus | "delete">("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = post?.status ?? "draft";
  const cancel = useBack(post ? `/blog/${post.id}` : "/blog?view=mine");

  async function save(next: BlogStatus) {
    setError("");
    if (!title.trim()) return setError("Give your post a title.");
    if (next === "published" && !html) return setError("Write something before publishing.");
    setBusy(next);
    try {
      const json = { title, contentHtml: html, status: next, itemIds: items.map((i) => i.id) };
      const res = post
        ? await api<{ post: { id: string } }>(`/api/blog/posts/${post.id}`, { method: "PATCH", json })
        : await api<{ post: { id: string } }>("/api/blog/posts", { json });
      toast.success(next === "published" ? (status === "published" ? "Post updated" : "Post published") : "Draft saved");
      router.push(next === "published" ? `/blog/${res.post.id}` : `/blog/${res.post.id}/edit`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the post");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!post) return;
    setBusy("delete");
    try {
      await api(`/api/blog/posts/${post.id}`, { method: "DELETE" });
      toast.success("Post deleted");
      router.push("/blog?view=mine");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete the post");
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-40 sm:px-6 md:pb-24 md:pt-10">
      <PhoneHeader
        backHref="/blog?view=mine"
        title={post ? (status === "published" ? "Edit post" : "Edit draft") : "New post"}
        left={<Button variant="ghost" size="sm" className="h-11 px-3 text-foreground" onClick={cancel}>Cancel</Button>}
        right={
          <Button size="sm" className="h-9" loading={busy === "published"} disabled={Boolean(busy)} onClick={() => void save("published")} data-testid="publish-post-phone">
            {status === "published" ? "Update" : "Publish"}
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 max-md:hidden">
        <Link href="/blog?view=mine" className="inline-flex items-center gap-1.5 text-meta text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Your posts
        </Link>
        <div className="flex items-center gap-2">
          {post && <Badge tone={status === "published" ? "success" : "neutral"}>{status === "published" ? "Published" : "Draft"}</Badge>}
          {post && status === "published" && (
            <Link href={`/blog/${post.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-meta text-muted hover:bg-surface-hover hover:text-foreground">
              <Eye className="size-4" aria-hidden /> View
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="sr-only">Title</span>
            <textarea
              data-testid="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
              maxLength={140}
              rows={1}
              placeholder="Title"
              className="field-sizing-content w-full resize-none bg-transparent text-title font-semibold leading-tight tracking-tight outline-none placeholder:text-muted/60"
            />
          </label>
          <div className="md:hidden">
            <ItemTagPicker value={items} onChange={setItems} variant="chips" />
          </div>
          {error && <div className="md:hidden"><FormError>{error}</FormError></div>}
          <BlogEditor initialHtml={post?.contentHtml ?? ""} onChange={setHtml} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-3xl border border-border bg-surface p-5 max-md:hidden">
            <h2 className="text-meta font-semibold">Tagged items</h2>
            <div className="mt-3">
              <ItemTagPicker value={items} onChange={setItems} />
            </div>
          </section>
          <section className="space-y-2 rounded-3xl border border-border bg-surface p-5">
            {error && <div className="max-md:hidden"><FormError>{error}</FormError></div>}
            <Button className="w-full max-md:hidden" loading={busy === "published"} disabled={Boolean(busy)} onClick={() => void save("published")} data-testid="publish-post">
              <Send className="size-4" aria-hidden /> {status === "published" ? "Update post" : "Publish"}
            </Button>
            <Button variant="secondary" className="w-full" loading={busy === "draft"} disabled={Boolean(busy)} onClick={() => void save("draft")}>
              {status === "published" ? "Unpublish to draft" : "Save draft"}
            </Button>
            {post && (
              <Button variant="ghost" className="w-full text-danger hover:text-danger" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden /> Delete post
              </Button>
            )}
            <p className="pt-1 text-caption text-muted">Published posts are public and appear on the items you tag.</p>
          </section>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        body={`“${title || "Untitled"}” will be permanently removed.`}
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
