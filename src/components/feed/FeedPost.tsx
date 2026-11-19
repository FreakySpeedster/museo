"use client";

import clsx from "clsx";
import { ArrowUpRight, Compass, Link2, MessageCircle, MoreHorizontal, Send, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CommentDTO, TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { timeAgo } from "@/lib/time";
import { count, plural } from "@/lib/plural";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { TagList } from "@/components/ui/Tags";
import { useToast } from "@/components/ui/Toast";
import { LikeButton } from "@/components/social/LikeButton";
import { CollectButton } from "@/components/collect/CollectButton";
import { PostMedia } from "./PostMedia";

const CAPTION_CLAMP = 140;
const COMMENTS_STEP = 10;

/**
 * A full post in the feed (no card): who + which collection, the photos at their own shape, actions,
 * likes, title and caption, the first two comments, inline "view all" and an inline comment field.
 */
export function FeedPost({ entry, viewerId, onPatch, eager }: { entry: TimelineEntry; viewerId?: string | null; onPatch: (e: TimelineEntry) => void; eager?: boolean }) {
  const e = entry;
  const toast = useToast();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState<CommentDTO[] | null>(null);
  const [shown, setShown] = useState(COMMENTS_STEP);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [mine, setMine] = useState<CommentDTO[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const liking = useRef(false);
  const signedIn = Boolean(viewerId);
  const longCaption = e.description.length > CAPTION_CLAMP || e.description.split("\n").length > 2;

  async function doubleTapLike() {
    if (!signedIn) return toast.info("Sign in to like this.");
    if (e.likedByMe || liking.current) return;
    liking.current = true;
    onPatch({ ...e, likedByMe: true, likeCount: e.likeCount + 1 });
    try {
      const r = await api<{ likeCount: number; likedByMe: boolean }>(`/api/items/${e.id}/like`, { method: "POST" });
      onPatch({ ...e, ...r });
    } catch {
      onPatch(e);
      toast.error("Couldn't like that");
    } finally {
      liking.current = false;
    }
  }

  async function share() {
    const link = `${window.location.origin}/i/${e.id}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title: e.title, url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied");
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  async function loadComments() {
    if (all || loadingComments) return;
    setLoadingComments(true);
    try {
      const r = await api<{ comments: CommentDTO[] }>(`/api/items/${e.id}/comments`);
      setAll(r.comments.filter((c) => !c.parentId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load comments");
    } finally {
      setLoadingComments(false);
    }
  }

  async function post(ev: React.FormEvent) {
    ev.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const { comment } = await api<{ comment: CommentDTO }>(`/api/items/${e.id}/comments`, { method: "POST", json: { body } });
      setDraft("");
      if (all) setAll([...all, comment]);
      else setMine((m) => [...m, comment]);
      onPatch({ ...e, commentCount: e.commentCount + 1 });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't post that comment");
    } finally {
      setPosting(false);
    }
  }

  const preview = all ? all.slice(0, shown) : [...(e.previewComments ?? []), ...mine.filter((m) => !e.previewComments?.some((p) => p.id === m.id))];
  const hidden = all ? Math.max(0, all.length - shown) : Math.max(0, e.commentCount - (e.previewComments?.length ?? 0) - mine.length);

  return (
    <article className="border-b border-border/70 pb-5 pt-3 last:border-b-0" data-testid="feed-post" data-feed-card>
      <header className="flex items-center gap-3 pb-3">
        <Link href={`/u/${e.user.username}`} className="shrink-0 rounded-full" aria-label={e.user.displayName}>
          <Avatar name={e.user.displayName} username={e.user.username} avatarUrl={e.user.avatarUrl} size={32} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-meta">
            <Link href={`/u/${e.user.username}`} className="font-semibold">{e.user.username}</Link>
            <span className="text-muted"> · {timeAgo(e.createdAt)}</span>
          </p>
          <Link href={`/u/${e.user.username}?page=${e.page.id}`} className="block truncate text-caption text-muted hover:text-foreground">{e.shelf.name}</Link>
        </div>
        <Menu
          label="Post options"
          items={[
            { label: "Open post", icon: <SquareArrowOutUpRight className="size-4" aria-hidden />, onSelect: () => router.push(`/i/${e.id}`) },
            { label: "See who else has it", icon: <Compass className="size-4" aria-hidden />, onSelect: () => router.push(`/explore/item/${e.canonicalKey}`), hidden: !e.canonicalKey },
            { label: "Copy link", icon: <Link2 className="size-4" aria-hidden />, onSelect: () => void navigator.clipboard.writeText(`${window.location.origin}/i/${e.id}`).then(() => toast.success("Link copied")) },
          ]}
          trigger={({ props }) => (
            <button type="button" {...props} aria-label="Post options" className="-mr-2 grid size-11 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground">
              <MoreHorizontal className="size-5" aria-hidden />
            </button>
          )}
        />
      </header>

      <PostMedia item={e} eager={eager} onDoubleTap={doubleTapLike} className="-mx-4 !w-[calc(100%+2rem)] sm:mx-0 sm:!w-full sm:rounded-2xl" />

      <div className="-mx-2 flex items-center pt-1.5">
        <LikeButton
          itemId={e.id}
          likeCount={e.likeCount}
          likedByMe={e.likedByMe}
          signedIn={signedIn}
          hideCount
          iconClassName="size-6"
          className="!px-0 text-foreground"
          onChange={(s) => onPatch({ ...e, ...s })}
        />
        <button
          type="button"
          aria-label={count(e.commentCount, "comment")}
          onClick={() => {
            if (e.canComment) input.current?.focus();
            else void loadComments();
          }}
          className="grid min-h-11 min-w-11 place-items-center rounded-full transition-transform hover:bg-surface-hover active:scale-90"
        >
          <MessageCircle className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <button type="button" aria-label="Share" onClick={() => void share()} className="grid min-h-11 min-w-11 place-items-center rounded-full transition-transform hover:bg-surface-hover active:scale-90">
          <Send className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <span className="flex-1" />
        <CollectButton itemId={e.id} ownerId={e.user.id} viewerId={viewerId} collected={e.collected} onChange={(c) => onPatch({ ...e, collected: c })} />
      </div>

      <div className="space-y-1.5">
        {e.likeCount > 0 && <p className="text-meta font-semibold tabular-nums">{e.likeCount.toLocaleString("en-US")} {plural("like", e.likeCount)}</p>}
        <h2 className="text-body font-semibold leading-snug">{e.title}</h2>
        {e.description && (
          <p className={clsx("whitespace-pre-line text-meta text-foreground/90", !expanded && longCaption && "line-clamp-2")}>
            {e.description}
          </p>
        )}
        {longCaption && !expanded && (
          <button type="button" onClick={() => setExpanded(true)} className="text-meta text-muted hover:text-foreground">more</button>
        )}
        {(e.tags?.length ?? 0) > 0 && <TagList tags={e.tags} />}
        {e.url && (
          <a href={e.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex max-w-full items-center gap-1 text-caption font-medium text-muted hover:text-foreground">
            <span className="truncate">{e.siteName ?? "Visit link"}</span> <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
          </a>
        )}

        {preview.length > 0 && (
          <ul className="space-y-1 pt-1" data-testid="post-comments">
            {preview.map((c) => (
              <li key={c.id} className="text-meta leading-snug">
                <Link href={`/u/${c.user.username}`} className="font-semibold">{c.user.username}</Link>{" "}
                <span className="whitespace-pre-line text-foreground/90">{c.body}</span>
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => (all ? setShown((n) => n + COMMENTS_STEP) : void loadComments())}
            className="block min-h-8 text-meta text-muted hover:text-foreground"
            data-testid="view-comments"
          >
            {loadingComments ? "Loading…" : all ? `Show ${Math.min(hidden, COMMENTS_STEP)} more` : `View all ${count(e.commentCount, "comment")}`}
          </button>
        )}
        {e.canComment && (
          <form onSubmit={post} className="flex items-center gap-2 pt-1">
            <input
              ref={input}
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              placeholder="Add a comment…"
              aria-label={`Comment on ${e.title}`}
              maxLength={500}
              enterKeyHint="send"
              className="h-9 min-w-0 flex-1 bg-transparent text-meta outline-none placeholder:text-muted"
            />
            {draft.trim() && (
              <button type="submit" disabled={posting} className="h-9 px-1 text-meta font-semibold text-foreground disabled:opacity-50">Post</button>
            )}
          </form>
        )}
      </div>
    </article>
  );
}
