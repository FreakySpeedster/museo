"use client";

import { useState } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { categoryMeta } from "@/lib/categories";
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
                {meta.emoji} {shelf.name}
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
                    <span aria-hidden>↗</span>
                  </a>
                )}
                {isOwner && (
                  <div className="mt-auto space-y-3 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                      <Button variant="secondary" size="sm" disabled={idx <= 0} onClick={() => onMove(it, -1)} aria-label="Move earlier on shelf">← Earlier</Button>
                      <Button variant="secondary" size="sm" disabled={!shelf || idx >= shelf.items.length - 1} onClick={() => onMove(it, 1)} aria-label="Move later on shelf">Later →</Button>
                      {!confirming && <Button variant="ghost" size="sm" className="ml-auto hover:text-red-600" onClick={() => setConfirming(true)}>Delete</Button>}
                    </div>
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
