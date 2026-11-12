"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, ImagePlus, RefreshCw } from "lucide-react";
import { LikeButton } from "@/components/social/LikeButton";
import { CommentThread } from "@/components/social/CommentThread";
import { Skeleton } from "@/components/ui/Skeleton";
import { PhotoPicker, type PhotoCandidate } from "./PhotoPicker";
import { categoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { timeAgo } from "@/lib/time";
import { ItemThumb } from "./ItemThumb";

const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

export function ItemModal({
  item,
  shelf,
  isOwner,
  viewerId,
  onClose,
  onUpdated,
  onDeleted,
  onMove,
}: {
  item: ItemDTO | null;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  viewerId?: string | null;
  onClose: () => void;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onMove?: (item: ItemDTO, dir: -1 | 1) => void;
}) {
  // Keep the last item around so content stays rendered while the close animation plays.
  const [shown, setShown] = useState<ItemDTO | null>(item);
  if (item && item !== shown) setShown(item);
  const it = item ?? shown;
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={it?.title ?? "Item"} size="xl">
      {it && <ItemBody key={it.id} it={it} shelf={shelf} isOwner={isOwner} viewerId={viewerId} onUpdated={onUpdated} onDeleted={onDeleted} onMove={onMove} />}
    </Modal>
  );
}

function ItemBody({
  it,
  shelf,
  isOwner,
  viewerId,
  onUpdated,
  onDeleted,
  onMove,
}: {
  it: ItemDTO;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  viewerId?: string | null;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onMove?: (item: ItemDTO, dir: -1 | 1) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(it.title);
  const [description, setDescription] = useState(it.description);
  const idx = shelf ? shelf.items.findIndex((i) => i.id === it.id) : -1;
  const meta = shelf ? categoryMeta(shelf.category) : null;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const { item: updated } = await api<{ item: ItemDTO }>(`/api/items/${it.id}`, { method: "PATCH", json: { title, description } });
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

  return (
        <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface-hover md:aspect-[4/5]">
            <ItemThumb item={it} eager />
          </div>
          <div className="flex min-w-0 flex-col">
            {meta && shelf && (
              <p className="text-micro font-medium uppercase tracking-wide text-muted">
                <span className="inline-flex items-center gap-1.5"><CategoryIcon category={shelf.category} className="size-4" />{shelf.name}</span>
              </p>
            )}
            {editing ? (
              <div className="mt-3 space-y-3">
                <Field label="Title" htmlFor="edit-title"><Input id="edit-title" data-autofocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Thoughts" htmlFor="edit-desc"><Textarea id="edit-desc" rows={5} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} /></Field>
                {error && <FormError>{error}</FormError>}
                <div className="flex gap-2">
                  <Button onClick={save} loading={busy} size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTitle(it.title); setDescription(it.description); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-1 text-heading font-semibold leading-tight tracking-tight sm:text-title">{it.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-caption text-muted" data-testid="item-added">
                  <Clock className="size-4" aria-hidden />
                  <time dateTime={it.createdAt} title={fullDate(it.createdAt)} className="cursor-help underline decoration-dotted decoration-border underline-offset-4">Added {timeAgo(it.createdAt)}</time>
                  <span className="sr-only">{fullDate(it.createdAt)}</span>
                </p>
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
                </div>
                <CommentThread
                  itemId={it.id}
                  commentCount={it.commentCount}
                  viewerId={viewerId}
                  onCountChange={(n) => onUpdated({ ...it, commentCount: n })}
                />
                {isOwner && (
                  <div className="mt-auto space-y-3 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                      <Button variant="secondary" size="sm" data-testid="change-photo" aria-expanded={photoOpen} onClick={() => setPhotoOpen((v) => !v)}><ImagePlus className="size-4" aria-hidden /> Photo</Button>
                      <Button variant="secondary" size="sm" disabled={!onMove || idx <= 0} onClick={() => onMove?.(it, -1)} aria-label="Move earlier on shelf"><ArrowLeft className="size-4" aria-hidden /> Earlier</Button>
                      <Button variant="secondary" size="sm" disabled={!onMove || !shelf || idx >= shelf.items.length - 1} onClick={() => onMove?.(it, 1)} aria-label="Move later on shelf">Later <ArrowRight className="size-4" aria-hidden /></Button>
                      {!confirming && <Button variant="ghost" size="sm" className="ml-auto hover:text-danger" onClick={() => setConfirming(true)}>Delete</Button>}
                    </div>
                    {photoOpen && <ItemPhotoEditor it={it} onUpdated={(u) => { onUpdated(u); setPhotoOpen(false); }} onCancel={() => setPhotoOpen(false)} />}
                    {confirming && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger-subtle p-3">
                        <p className="text-meta">Delete this item for good?</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
                          <Button variant="danger" size="sm" loading={busy} onClick={remove}>Delete</Button>
                        </div>
                      </div>
                    )}
                    {error && !editing && <FormError>{error}</FormError>}
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
