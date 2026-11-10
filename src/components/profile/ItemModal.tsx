"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, ArrowRight, ArrowUpRight, ImagePlus, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { PhotoPicker, type PhotoCandidate } from "./PhotoPicker";
import { categoryMeta } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { timeAgo } from "@/lib/time";
import { ItemThumb } from "./ItemThumb";

export function ItemModal({
  item,
  shelf,
  isOwner,
  onClose,
  onUpdated,
  onDeleted,
  onMove,
}: {
  item: ItemDTO | null;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  onClose: () => void;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onMove: (item: ItemDTO, dir: -1 | 1) => void;
}) {
  // Keep the last item around so content stays rendered while the close animation plays.
  const [shown, setShown] = useState<ItemDTO | null>(item);
  if (item && item !== shown) setShown(item);
  const it = item ?? shown;
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={it?.title ?? "Item"} size="xl">
      {it && <ItemBody key={it.id} it={it} shelf={shelf} isOwner={isOwner} onUpdated={onUpdated} onDeleted={onDeleted} onMove={onMove} />}
    </Modal>
  );
}

function ItemBody({
  it,
  shelf,
  isOwner,
  onUpdated,
  onDeleted,
  onMove,
}: {
  it: ItemDTO;
  shelf: ShelfDTO | null;
  isOwner: boolean;
  onUpdated: (item: ItemDTO) => void;
  onDeleted: (item: ItemDTO) => void;
  onMove: (item: ItemDTO, dir: -1 | 1) => void;
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
          <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-surface-2 md:aspect-[4/5]">
            <ItemThumb item={it} eager />
          </div>
          <div className="flex min-w-0 flex-col">
            {meta && shelf && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                <span className="inline-flex items-center gap-1.5"><CategoryIcon category={shelf.category} className="size-3.5" />{shelf.name}</span>
              </p>
            )}
            {editing ? (
              <div className="mt-3 space-y-3">
                <Field label="Title" htmlFor="edit-title"><Input id="edit-title" data-autofocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Description" htmlFor="edit-desc"><Textarea id="edit-desc" rows={5} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} /></Field>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={save} loading={busy} size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTitle(it.title); setDescription(it.description); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{it.title}</h3>
                <p className="mt-1 text-xs text-muted">Added {timeAgo(it.createdAt)}</p>
                {it.description ? (
                  <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{it.description}</p>
                ) : (
                  <p className="mt-4 text-sm italic text-muted">No description.</p>
                )}
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="mt-5 inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink shadow-[0_6px_20px_-6px_var(--accent)] transition hover:brightness-110"
                  >
                    <span className="truncate">Visit {it.siteName ?? "link"}</span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  </a>
                )}
                {isOwner && (
                  <div className="mt-auto space-y-3 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                      <Button variant="secondary" size="sm" data-testid="change-photo" aria-expanded={photoOpen} onClick={() => setPhotoOpen((v) => !v)}><ImagePlus className="size-4" aria-hidden /> Photo</Button>
                      <Button variant="secondary" size="sm" disabled={idx <= 0} onClick={() => onMove(it, -1)} aria-label="Move earlier on shelf"><ArrowLeft className="size-4" aria-hidden /> Earlier</Button>
                      <Button variant="secondary" size="sm" disabled={!shelf || idx >= shelf.items.length - 1} onClick={() => onMove(it, 1)} aria-label="Move later on shelf">Later <ArrowRight className="size-4" aria-hidden /></Button>
                      {!confirming && <Button variant="ghost" size="sm" className="ml-auto hover:text-red-600" onClick={() => setConfirming(true)}>Delete</Button>}
                    </div>
                    {photoOpen && <ItemPhotoEditor it={it} onUpdated={(u) => { onUpdated(u); setPhotoOpen(false); }} onCancel={() => setPhotoOpen(false)} />}
                    {confirming && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3">
                        <p className="text-sm">Delete this item for good?</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
                          <Button variant="danger" size="sm" loading={busy} onClick={remove}>Delete</Button>
                        </div>
                      </div>
                    )}
                    {error && !editing && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
    <div data-testid="photo-editor" className="space-y-3 rounded-2xl border border-line bg-surface-2 p-3">
      {candidates === null ? (
        <div aria-busy="true" className="flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="size-16 shrink-0 sm:size-[72px]" />)}</div>
      ) : (
        <PhotoPicker candidates={candidates} selected={pick} onSelect={(u) => { setPick(u); setOwn(null); }} ownUrl={ownUrl} onOwn={setOwn} onClearOwn={() => setOwn(null)} onError={setError} />
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
