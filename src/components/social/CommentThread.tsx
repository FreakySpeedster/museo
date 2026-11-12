"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
import type { CommentDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function CommentThread({
  itemId,
  commentCount,
  viewerId,
  onCountChange,
}: {
  itemId: string;
  commentCount: number;
  viewerId?: string | null;
  onCountChange?: (n: number) => void;
}) {
  const toast = useToast();
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [reason, setReason] = useState<string | null>("Sign in to comment.");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(commentCount);

  useEffect(() => {
    let live = true;
    api<{ comments: CommentDTO[]; canComment: boolean; reason: string | null }>(`/api/items/${itemId}/comments`)
      .then((r) => {
        if (!live) return;
        setComments(r.comments);
        setCanComment(r.canComment);
        setReason(r.reason);
        setCount(r.comments.length);
        onCountChange?.(r.comments.length);
      })
      .catch(() => live && setComments([]));
    return () => {
      live = false;
    };
    // Count callback is stable enough for this load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !canComment || busy) return;
    setBusy(true);
    setError("");
    const optimistic: CommentDTO = {
      id: `tmp-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
      user: { id: viewerId ?? "", username: "", displayName: "You", bio: "", avatarUrl: null },
    };
    setComments((c) => [...(c ?? []), optimistic]);
    setBody("");
    const nextCount = count + 1;
    setCount(nextCount);
    onCountChange?.(nextCount);
    try {
      const { comment } = await api<{ comment: CommentDTO }>(`/api/items/${itemId}/comments`, { json: { body: text } });
      setComments((c) => (c ?? []).map((x) => (x.id === optimistic.id ? comment : x)));
    } catch (err) {
      setComments((c) => (c ?? []).filter((x) => x.id !== optimistic.id));
      setBody(text);
      setCount((n) => Math.max(0, n - 1));
      onCountChange?.(Math.max(0, count));
      setError(err instanceof ApiError ? err.message : "Couldn't post that");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const prev = comments;
    setComments((c) => (c ?? []).filter((x) => x.id !== id));
    setCount((n) => Math.max(0, n - 1));
    onCountChange?.(Math.max(0, count - 1));
    try {
      await api(`/api/comments/${id}`, { method: "DELETE" });
    } catch (err) {
      setComments(prev);
      setCount((n) => n + 1);
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete that");
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Comments">
      <h3 className="mb-3 flex items-center gap-1.5 text-meta font-semibold">
        <MessageCircle className="size-4" aria-hidden />
        Comments {count > 0 && <span className="font-normal text-muted">({count})</span>}
      </h3>
      <div className="space-y-3">
        {comments === null && <p className="text-caption text-muted">Loading comments…</p>}
        {comments?.length === 0 && <p className="text-caption text-muted">No comments yet.</p>}
        {comments?.map((c) => (
          <article key={c.id} className="flex gap-2.5">
            <Avatar name={c.user.displayName} username={c.user.username} avatarUrl={c.user.avatarUrl} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-caption">
                {c.user.username ? (
                  <Link href={`/u/${c.user.username}`} className="font-medium hover:underline">
                    {c.user.displayName}
                  </Link>
                ) : (
                  <span className="font-medium">{c.user.displayName}</span>
                )}
                <span className="ml-1.5 text-muted">{timeAgo(c.createdAt)}</span>
              </p>
              <p className="whitespace-pre-line text-meta leading-relaxed">{c.body}</p>
            </div>
            {viewerId && c.user.id === viewerId && !c.id.startsWith("tmp-") && (
              <button type="button" className="shrink-0 rounded-full p-1 text-muted hover:bg-surface-hover hover:text-danger" aria-label="Delete comment" onClick={() => remove(c.id)}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 space-y-2">
        <Textarea
          rows={3}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={canComment ? "Write a comment" : reason ?? "Comments are closed"}
          disabled={!canComment || busy}
          aria-label="Comment"
        />
        {error && <FormError>{error}</FormError>}
        <div className="flex items-center justify-between gap-2">
          {!canComment && reason && <p className="text-caption text-muted">{reason}</p>}
          {canComment && (
            <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
              Post
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
