"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CornerDownRight, MessageCircle, SmilePlus, Trash2, X } from "lucide-react";
import type { CommentDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { timeAgo } from "@/lib/time";
import { REACTION_EMOJIS } from "@/lib/validation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useToast } from "@/components/ui/Toast";

type Lists = { comments: CommentDTO[]; canComment: boolean; reason: string | null };

export function CommentThread({
  itemId,
  commentCount,
  viewerId,
  onCountChange,
  docked = false,
}: {
  itemId: string;
  commentCount: number;
  viewerId?: string | null;
  onCountChange?: (n: number) => void;
  /** Phones: pin a one-line composer to the bottom of the screen, riding above the keyboard. */
  docked?: boolean;
}) {
  const keyboard = useKeyboardInset();
  const toast = useToast();
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [reason, setReason] = useState<string | null>("Sign in to comment.");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(commentCount);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    api<Lists>(`/api/items/${itemId}/comments`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const bump = (d: number) => {
    setCount((n) => {
      const next = Math.max(0, n + d);
      onCountChange?.(next);
      return next;
    });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !canComment || busy) return;
    setBusy(true);
    setError("");
    const parentId = replyTo ? replyTo.parentId ?? replyTo.id : undefined;
    const optimistic: CommentDTO = {
      id: `tmp-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
      user: { id: viewerId ?? "", username: "", displayName: "You", bio: "", avatarUrl: null, socialLinks: [] },
      parentId: parentId ?? null,
      reactions: [],
    };
    setComments((c) => [...(c ?? []), optimistic]);
    setBody("");
    setReplyTo(null);
    bump(1);
    try {
      const { comment } = await api<{ comment: CommentDTO }>(`/api/items/${itemId}/comments`, { json: { body: text, parentId } });
      setComments((c) => (c ?? []).map((x) => (x.id === optimistic.id ? comment : x)));
    } catch (err) {
      setComments((c) => (c ?? []).filter((x) => x.id !== optimistic.id));
      setBody(text);
      bump(-1);
      setError(err instanceof ApiError ? err.message : "Couldn't post that");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const prev = comments;
    const gone = (prev ?? []).filter((x) => x.id === id || x.parentId === id).length;
    setComments((c) => (c ?? []).filter((x) => x.id !== id && x.parentId !== id));
    bump(-gone);
    try {
      await api(`/api/comments/${id}`, { method: "DELETE" });
    } catch (err) {
      setComments(prev);
      bump(gone);
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete that");
    }
  }

  async function react(c: CommentDTO, emoji: string) {
    if (!viewerId) return toast.error("Sign in to react.");
    const prev = comments;
    // Optimistic toggle so stacking several emojis feels instant.
    setComments((list) =>
      (list ?? []).map((x) => {
        if (x.id !== c.id) return x;
        const has = x.reactions.find((r) => r.emoji === emoji);
        const reactions = has
          ? x.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine } : r)).filter((r) => r.count > 0)
          : [...x.reactions, { emoji, count: 1, mine: true }];
        return { ...x, reactions };
      }),
    );
    try {
      const { comment } = await api<{ comment: CommentDTO }>(`/api/comments/${c.id}/reactions`, { json: { emoji } });
      setComments((list) => (list ?? []).map((x) => (x.id === c.id ? { ...x, reactions: comment.reactions } : x)));
    } catch (err) {
      setComments(prev);
      toast.error(err instanceof ApiError ? err.message : "Couldn't react");
    }
  }

  function startReply(c: CommentDTO) {
    setReplyTo(c);
    requestAnimationFrame(() => box.current?.focus());
  }

  const top = (comments ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (comments ?? []).filter((c) => c.parentId === id);
  const row = (c: CommentDTO, nested = false) => (
    <CommentRow key={c.id} c={c} nested={nested} viewerId={viewerId} canReply={canComment} onReply={startReply} onReact={react} onDelete={remove} />
  );

  return (
    <section aria-label="Comments">
      <h3 className="mb-3 flex items-center gap-1.5 text-meta font-semibold">
        <MessageCircle className="size-4" aria-hidden />
        Comments {count > 0 && <span className="font-normal text-muted">({count})</span>}
      </h3>
      <div className="space-y-4">
        {comments === null && <p className="text-caption text-muted">Loading comments…</p>}
        {comments?.length === 0 && <p className="text-caption text-muted">No comments yet.</p>}
        {top.map((c) => (
          <div key={c.id} className="space-y-3">
            {row(c)}
            {repliesOf(c.id).length > 0 && <div className="ml-4 space-y-3 border-l border-border pl-4">{repliesOf(c.id).map((r) => row(r, true))}</div>}
          </div>
        ))}
      </div>
      <form
        onSubmit={submit}
        data-testid="comment-composer"
        style={docked ? ({ "--kb": `${keyboard}px` } as React.CSSProperties) : undefined}
        className={clsx(
          "mt-4 space-y-2",
          docked &&
            "max-md:fixed max-md:inset-x-0 max-md:bottom-[var(--kb)] max-md:z-nav max-md:mt-0 max-md:border-t max-md:border-border max-md:bg-background/95 max-md:px-4 max-md:pt-2 max-md:backdrop-blur max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {replyTo && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-hover px-3 py-1.5 text-caption">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">
              <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Replying to <span className="font-medium text-foreground">{replyTo.user.displayName}</span></span>
            </span>
            <button type="button" aria-label="Cancel reply" className="rounded-full p-0.5 text-muted hover:text-foreground" onClick={() => setReplyTo(null)}>
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
        <div className={clsx(docked && "max-md:flex max-md:items-end max-md:gap-2")}>
        <Textarea
          ref={box}
          rows={docked ? 1 : 3}
          className={clsx(docked && "max-md:max-h-32 max-md:min-h-11 max-md:flex-1 max-md:resize-none max-md:rounded-3xl max-md:py-2.5 md:min-h-20 [field-sizing:content]")}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={canComment ? (replyTo ? "Write a reply" : "Write a comment") : reason ?? "Comments are closed"}
          disabled={!canComment || busy}
          aria-label="Comment"
        />
        {docked && canComment && (
          <Button type="submit" size="sm" loading={busy} disabled={!body.trim()} className="h-11 shrink-0 md:hidden">
            {replyTo ? "Reply" : "Post"}
          </Button>
        )}
        </div>
        {error && <FormError>{error}</FormError>}
        <div className={clsx("flex items-center justify-between gap-2", docked && "max-md:hidden")}>
          {!canComment && reason && <p className="text-caption text-muted">{reason}</p>}
          {canComment && (
            <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
              {replyTo ? "Reply" : "Post"}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function CommentRow({
  c,
  nested,
  viewerId,
  canReply,
  onReply,
  onReact,
  onDelete,
}: {
  c: CommentDTO;
  nested: boolean;
  viewerId?: string | null;
  canReply: boolean;
  onReply: (c: CommentDTO) => void;
  onReact: (c: CommentDTO, emoji: string) => void;
  onDelete: (id: string) => void;
}) {
  const [picker, setPicker] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pending = c.id.startsWith("tmp-");

  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setPicker(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [picker]);

  return (
    <article className="flex gap-2.5">
      <Avatar name={c.user.displayName} username={c.user.username} avatarUrl={c.user.avatarUrl} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="text-caption">
          {c.user.username ? (
            <Link href={`/u/${c.user.username}`} className="font-medium hover:underline">{c.user.displayName}</Link>
          ) : (
            <span className="font-medium">{c.user.displayName}</span>
          )}
          <span className="ml-1.5 text-muted">{timeAgo(c.createdAt)}</span>
        </p>
        <p className="whitespace-pre-line text-meta leading-relaxed">{c.body}</p>
        {!pending && (
          <div ref={wrap} className="relative mt-1.5 flex flex-wrap items-center gap-1.5">
            {c.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(c, r.emoji)}
                aria-pressed={r.mine}
                aria-label={`${r.emoji} ${r.count}`}
                className={clsx(
                  "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption tabular-nums transition-colors",
                  r.mine ? "border-foreground/60 bg-foreground/10" : "border-border hover:bg-surface-hover",
                )}
              >
                <span className="text-[13px] leading-none">{r.emoji}</span>
                {r.count}
              </button>
            ))}
            {viewerId && (
              <button type="button" aria-label="Add reaction" aria-expanded={picker} onClick={() => setPicker((v) => !v)} className="inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground">
                <SmilePlus className="size-3.5" aria-hidden />
              </button>
            )}
            {canReply && (
              <button type="button" onClick={() => onReply(c)} className="h-6 rounded-full px-1.5 text-caption font-medium text-muted hover:text-foreground">
                Reply
              </button>
            )}
            {picker && (
              <div role="menu" className="absolute left-0 top-full z-20 mt-1 flex gap-0.5 rounded-full border border-border bg-surface p-1 shadow-lg">
                {REACTION_EMOJIS.map((e) => {
                  const mine = c.reactions.some((r) => r.emoji === e && r.mine);
                  return (
                    <button key={e} type="button" role="menuitemcheckbox" aria-checked={mine} onClick={() => onReact(c, e)} className={clsx("flex size-8 items-center justify-center rounded-full text-base transition-transform hover:scale-110 hover:bg-surface-hover", mine && "bg-foreground/10")}>
                      {e}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {viewerId && c.user.id === viewerId && !pending && (
        <button type="button" className="shrink-0 self-start rounded-full p-1 text-muted hover:bg-surface-hover hover:text-danger" aria-label={nested ? "Delete reply" : "Delete comment"} onClick={() => onDelete(c.id)}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      )}
    </article>
  );
}
