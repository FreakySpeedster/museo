"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, Heart } from "lucide-react";
import Link from "next/link";
import { count } from "@/lib/plural";
import { useRouter } from "next/navigation";
import type { ItemDTO, ShelfDTO, TimelineEntry } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Eye, MoreHorizontal, RefreshCw } from "lucide-react";
import { ItemBlogPosts } from "@/components/blog/ItemBlogPosts";
import { LikeButton } from "@/components/social/LikeButton";
import { CollectButton } from "@/components/collect/CollectButton";
import { CommentThread } from "@/components/social/CommentThread";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { VisibilityLock } from "@/components/ui/VisibilityLock";
import { PhotoPicker, type PhotoCandidate } from "./PhotoPicker";
import { categoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { timeAgo } from "@/lib/time";
import { PhotoCarousel } from "./PhotoCarousel";
import { TagInput, TagList } from "@/components/ui/Tags";

const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

export function ItemModal({
  item,
  shelf,
  isOwner,
  viewerId,
  onClose,
  onUpdated,
  onDeleted,
  onNavigate,
}: {
  item: ItemDTO | null;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  viewerId?: string | null;
  onClose: () => void;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onNavigate?: (item: ItemDTO) => void;
}) {
  // Keep the last item around so content stays rendered while the close animation plays.
  const [shown, setShown] = useState<ItemDTO | null>(item);
  if (item && item !== shown) setShown(item);
  const it = item ?? shown;
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={it?.title ?? "Item"} size="xl">
      {it && <ItemBody key={it.id} it={it} shelf={shelf} isOwner={isOwner} viewerId={viewerId} onUpdated={onUpdated} onDeleted={onDeleted} onNavigate={onNavigate} />}
    </Modal>
  );
}

export function ItemBody({
  it,
  shelf,
  isOwner,
  viewerId,
  onUpdated,
  onDeleted,
  onNavigate,
  actionsSlot,
  docked = false,
}: {
  it: ItemDTO;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  viewerId?: string | null;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onNavigate?: (item: ItemDTO) => void;
  /** Phone item page: the header element the actions menu portals into. */
  actionsSlot?: HTMLElement | null;
  /** Phone item page: dock the comment composer to the bottom of the screen. */
  docked?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(it.title);
  const [description, setDescription] = useState(it.description);
  const [tags, setTags] = useState<string[]>(it.tags ?? []);
  const idx = shelf ? shelf.items.findIndex((i) => i.id === it.id) : -1;
  const meta = shelf ? categoryMeta(shelf.category) : null;
  const [views, setViews] = useState(it.viewCount ?? 0);

  // Count a view once the item is on screen. The server ignores the owner, bots and repeat visits (24h).
  useEffect(() => {
    if (isOwner) return;
    let live = true;
    api<{ viewCount: number }>(`/api/items/${it.id}/view`, { method: "POST" })
      .then((r) => live && setViews(r.viewCount))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [it.id, isOwner]);

  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const liking = useRef(false);
  /** Instagram double-tap: always likes (never unlikes) and pops a heart over the photo. */
  async function doubleTapLike() {
    setBurst((b) => b + 1);
    if (!viewerId) return toast.info("Sign in to like this.");
    if (it.likedByMe || liking.current) return;
    liking.current = true;
    onUpdated({ ...it, likedByMe: true, likeCount: it.likeCount + 1 });
    try {
      const r = await api<{ likeCount: number; likedByMe: boolean }>(`/api/items/${it.id}/like`, { method: "POST" });
      onUpdated({ ...it, ...r });
    } catch {
      onUpdated(it);
      toast.error("Couldn't like that");
    } finally {
      liking.current = false;
    }
  }
  function onPhotoPointerUp(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button,a")) return;
    const now = e.timeStamp;
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      void doubleTapLike();
    } else lastTap.current = now;
  }

  async function copyLink() {
    const link = `${window.location.origin}/i/${it.id}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title: it.title, url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.info(link);
    }
  }

  const actionItems = [
    { label: "Edit", hidden: !isOwner, onSelect: () => setEditing(true) },
    { label: "Change photo", hidden: !isOwner, onSelect: () => setPhotoOpen(true) },
    { label: "Write about it", hidden: !isOwner, onSelect: () => router.push(`/blog/new?item=${it.id}`) },
    { label: it.visibility === "private" ? "Make public" : "Make private", hidden: !isOwner, onSelect: () => void setVisibility(it.visibility === "private" ? "public" : "private") },
    { label: "Share link", onSelect: () => void copyLink() },
    { label: "Delete", danger: true, hidden: !isOwner, onSelect: () => setConfirming(true) },
  ];
  const actionsMenu = (
    <Menu
      label="Item actions"
      items={actionItems}
      trigger={({ props }) => (
        <IconButton label="Item actions" {...props} className="size-11 text-foreground">
          <MoreHorizontal className="size-5" aria-hidden />
        </IconButton>
      )}
    />
  );

  async function save() {
    setBusy(true);
    setError("");
    try {
      const { item: updated } = await api<{ item: ItemDTO }>(`/api/items/${it.id}`, { method: "PATCH", json: { title, description, tags } });
      onUpdated(updated);
      setEditing(false);
      toast.success("Saved");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/items/${it.id}`, { method: "DELETE" });
      onDeleted(it);
      toast.success("Item removed");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete");
      setBusy(false);
    }
  }

  async function setVisibility(visibility: "public" | "private") {
    setBusy(true);
    setError("");
    try {
      const { item: updated } = await api<{ item: ItemDTO }>(`/api/items/${it.id}`, { method: "PATCH", json: { visibility } });
      onUpdated(updated);
      toast.success(visibility === "private" ? "Item is now private" : "Item is now public");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update visibility");
    } finally {
      setBusy(false);
    }
  }

  return (
        <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
          <div
            className="relative aspect-square touch-manipulation select-none overflow-hidden rounded-2xl border border-border bg-surface-hover md:aspect-[4/5]"
            onPointerUp={onPhotoPointerUp}
            onDoubleClick={(e) => e.preventDefault()}
            data-testid="item-photo"
          >
            <PhotoCarousel item={it} eager hint={shelf ? { category: shelf.category, collection: shelf.name } : undefined} />
            {burst > 0 && (
              <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                <Heart className="heart-pop size-24 text-white drop-shadow-[0_6px_18px_rgb(0_0_0/0.35)]" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </div>
          {actionsSlot && createPortal(actionsMenu, actionsSlot)}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {meta && shelf && (
                  <p className="text-micro font-medium uppercase tracking-wide text-muted">
                    <span className="inline-flex items-center gap-1.5"><CategoryIcon category={shelf.category} className="size-4" />{shelf.name}</span>
                  </p>
                )}
              </div>
              <div className={clsx("-mr-2 -mt-2", actionsSlot !== undefined && "max-md:hidden")}>{actionsMenu}</div>
            </div>
            {editing ? (
              <div className="mt-3 space-y-3">
                <Field label="Title" htmlFor="edit-title"><Input id="edit-title" data-autofocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Thoughts" htmlFor="edit-desc"><Textarea id="edit-desc" rows={5} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} /></Field>
                <Field label="Tags" htmlFor="edit-tags"><TagInput id="edit-tags" value={tags} onChange={setTags} /></Field>
                {error && <FormError>{error}</FormError>}
                <div className="flex gap-2">
                  <Button onClick={save} loading={busy} size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTitle(it.title); setDescription(it.description); setTags(it.tags ?? []); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-1 flex items-center gap-2 text-heading font-semibold leading-tight tracking-tight sm:text-title">
                  <span>{it.title}</span>
                  {isOwner && it.visibility === "private" && <VisibilityLock label="Private item" />}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-caption text-muted" data-testid="item-added">
                  <Clock className="size-4" aria-hidden />
                  <time dateTime={it.createdAt} title={fullDate(it.createdAt)} className="cursor-help underline decoration-dotted decoration-border underline-offset-4">Added {timeAgo(it.createdAt)}</time>
                  <span className="sr-only">{fullDate(it.createdAt)}</span>
                  <span aria-hidden className="px-0.5">·</span>
                  <span className="inline-flex items-center gap-1" data-testid="item-views" title={isOwner ? "Unique views from other people (your own views don't count)" : "Views"}>
                    <Eye className="size-4" aria-hidden />
                    {count(views, "view")}
                  </span>
                </p>
                <TagList tags={it.tags ?? []} className="mt-3" />
                {it.description ? (
                  <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-foreground/90">{it.description}</p>
                ) : (
                  <p className="mt-4 text-meta italic text-muted">No thoughts yet.</p>
                )}
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className={buttonClass("primary", "md", "mt-5 w-fit max-w-full")}
                  >
                    <span className="truncate">Visit {it.siteName ?? "link"}</span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  </a>
                )}
                <div className="mt-5 flex items-center gap-1">
                  <LikeButton
                    itemId={it.id}
                    likeCount={it.likeCount}
                    likedByMe={it.likedByMe}
                    signedIn={Boolean(viewerId)}
                    onChange={(s) => onUpdated({ ...it, ...s })}
                  />
                  <span className="flex-1" />
                  {it.canonicalKey && (
                    <Link href={`/explore/item/${it.canonicalKey}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-caption font-medium text-muted hover:bg-surface-hover hover:text-foreground">
                      <Compass className="size-4" aria-hidden /> Who else has it
                    </Link>
                  )}
                  <CollectButton
                    itemId={it.id}
                    ownerId={isOwner ? (viewerId ?? "") : "someone-else"}
                    viewerId={viewerId}
                    collected={(it as Partial<TimelineEntry>).collected}
                    onChange={(c) => onUpdated({ ...it, collected: c } as ItemDTO)}
                  />
                </div>
                <ItemBlogPosts itemId={it.id} />
                {photoOpen && <div className="mt-4"><ItemPhotoEditor it={it} onUpdated={(u) => { onUpdated(u); setPhotoOpen(false); }} onCancel={() => setPhotoOpen(false)} /></div>}
                {confirming && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger-subtle p-3">
                    <p className="text-meta">Delete this item for good?</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
                      <Button variant="danger" size="sm" loading={busy} onClick={remove}>Delete</Button>
                    </div>
                  </div>
                )}
                {error && !editing && <div className="mt-3"><FormError>{error}</FormError></div>}
                <div className="mt-5 border-t border-border pt-5">
                  <CommentThread
                    itemId={it.id}
                    commentCount={it.commentCount}
                    viewerId={viewerId}
                    onCountChange={(n) => onUpdated({ ...it, commentCount: n })}
                    docked={docked}
                  />
                </div>
                {onNavigate && shelf && shelf.items.length > 1 && (
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
                    <Button variant="ghost" size="sm" disabled={idx <= 0} onClick={() => onNavigate(shelf.items[idx - 1])}>
                      <ArrowLeft className="size-4" aria-hidden /> Previous
                    </Button>
                    <p className="text-caption text-muted">{idx + 1} of {shelf.items.length}</p>
                    <Button variant="ghost" size="sm" disabled={idx >= shelf.items.length - 1} onClick={() => onNavigate(shelf.items[idx + 1])}>
                      Next <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
  );
}


/** Owner tool: pick another detected photo, use their own, or re-fetch the link's photo. */
function ItemPhotoEditor({ it, onUpdated, onCancel }: { it: ItemDTO; onUpdated: (item: ItemDTO) => void; onCancel: () => void }) {
  const toast = useToast();
  const isLink = it.type === "LINK" && Boolean(it.url);
  const [candidates, setCandidates] = useState<PhotoCandidate[] | null>(isLink ? null : []);
  const [pick, setPick] = useState<string | null>(null);
  const [own, setOwn] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "apply" | "refresh">("");
  const [error, setError] = useState("");
  const ownUrl = useMemo(() => (own ? URL.createObjectURL(own) : null), [own]);
  useEffect(() => () => {
    if (ownUrl) URL.revokeObjectURL(ownUrl);
  }, [ownUrl]);

  useEffect(() => {
    if (!isLink) return;
    let live = true;
    api<{ candidates: PhotoCandidate[] }>(`/api/items/${it.id}/thumbnail`)
      .then((r) => live && setCandidates(r.candidates))
      .catch(() => live && setCandidates([]));
    return () => {
      live = false;
    };
  }, [it.id, isLink]);

  async function apply() {
    setError("");
    setBusy("apply");
    try {
      let res: { item: ItemDTO };
      if (own) {
        const form = new FormData();
        form.set("file", own);
        res = await api(`/api/items/${it.id}/thumbnail`, { form });
      } else if (pick) {
        res = await api(`/api/items/${it.id}/thumbnail`, { json: { mode: "candidate", imageUrl: pick } });
      } else return setError("Pick a photo first.");
      toast.success("Photo updated");
      onUpdated(res.item);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the photo");
    } finally {
      setBusy("");
    }
  }

  async function refresh() {
    setError("");
    setBusy("refresh");
    try {
      const res = await api<{ item: ItemDTO }>(`/api/items/${it.id}/thumbnail`, { json: { mode: "auto" } });
      toast.success("Photo refreshed from the link");
      onUpdated(res.item);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't refresh the photo");
    } finally {
      setBusy("");
    }
  }

  return (
    <div data-testid="photo-editor" className="space-y-3 rounded-2xl border border-border bg-surface-hover p-3">
      {candidates === null ? (
        <div aria-busy="true" className="flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="size-16 shrink-0 sm:size-[72px]" />)}</div>
      ) : (
        <PhotoPicker candidates={candidates} selected={pick} onSelect={(u) => { setPick(u); setOwn(null); }} ownUrl={ownUrl} onOwn={setOwn} onClearOwn={() => setOwn(null)} onError={setError} />
      )}
      {error && <FormError>{error}</FormError>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={apply} loading={busy === "apply"} disabled={!own && !pick} data-testid="apply-photo">Use this photo</Button>
        {isLink && (
          <Button size="sm" variant="secondary" onClick={refresh} loading={busy === "refresh"} data-testid="refresh-photo">
            <RefreshCw className="size-4" aria-hidden /> Refresh from link
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
