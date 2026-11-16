"use client";

import { TagInput } from "@/components/ui/Tags";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Camera, Image as ImageIcon, Link2, Plus, X } from "lucide-react";
import { MAX_MANUAL_PHOTOS } from "@/lib/limits";
import { MAX_REQUEST_BYTES } from "@/lib/client-image";
import { categoryMeta } from "@/lib/categories";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { PhotoPicker, proxied, readPhotoFile, type PhotoCandidate } from "./PhotoPicker";

interface Preview { url: string; title: string; description: string; siteName: string; image: string | null; favicon: string | null; candidates: PhotoCandidate[] }

const MAX_MB = 8;
const MAX_PHOTOS = 6;
/** Each manual photo gets an equal share of the serverless request budget. */
const PER_PHOTO_BYTES = Math.floor((MAX_REQUEST_BYTES - 64 * 1024) / MAX_MANUAL_PHOTOS);

/** The picture to show on the preview card: the picked / best candidate's inline thumbnail, else a proxied copy. */
function shownSrc(preview: Preview, pick: string | null): string {
  const url = pick ?? preview.image;
  if (!url) return preview.favicon ?? "";
  const c = preview.candidates.find((x) => x.url === url);
  return c?.thumb ?? proxied(url);
}

export function AddItemDialog({
  open,
  shelf,
  onClose,
  onAdded,
  onLimit,
}: {
  open: boolean;
  shelf: ShelfDTO | null;
  onClose: () => void;
  onAdded: (item: ItemDTO) => void;
  /** Free plan item limit hit (server said ITEM_LIMIT). */
  onLimit?: () => void;
}) {
  const meta = shelf ? categoryMeta(shelf.category) : null;
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add to your collection" description={shelf ? `${shelf.name} · ${meta?.label}` : undefined}>
      {shelf && <AddItemForm shelf={shelf} onClose={onClose} onAdded={onAdded} onLimit={onLimit} />}
    </Modal>
  );
}

function AddItemForm({ shelf, onClose, onAdded, onLimit }: { shelf: ShelfDTO; onClose: () => void; onAdded: (item: ItemDTO) => void; onLimit?: () => void }) {
  const [mode, setMode] = useState<"LINK" | "PHOTO">("LINK");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ url: string; preview: Preview | null } | null>(null);
  const [files, setFiles] = useState<File[]>([]); // manual photos, first = cover (max 3)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [picks, setPicks] = useState<string[]>([]); // photos chosen by the user, in order (first = cover)
  const pick = picks[0] ?? null;
  const [own, setOwn] = useState<File | null>(null); // "use my own photo" for a link
  const titleTouched = useRef(false);
  const instant = useRef(false);

  const ownUrl = useMemo(() => (own ? URL.createObjectURL(own) : null), [own]);
  useEffect(() => () => {
    if (ownUrl) URL.revokeObjectURL(ownUrl);
  }, [ownUrl]);

  const filePreviews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => {
    filePreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [filePreviews]);

  // Live link preview (debounced). State is only set from async callbacks.
  const candidate = mode === "LINK" && url.trim().length >= 4 && url.includes(".") ? url.trim() : "";
  useEffect(() => {
    if (!candidate) return;
    const ctrl = new AbortController();
    const delay = instant.current ? 0 : 450;
    instant.current = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(candidate)}`, { signal: ctrl.signal });
        const data = await res.json();
        const p: Preview | null = res.ok ? { ...data.preview, candidates: data.preview.candidates ?? [] } : null;
        setResult({ url: candidate, preview: p });
        setPicks(p?.candidates[0] ? [p.candidates[0].url] : []);
        if (p?.title && !titleTouched.current) setTitle(p.title); // auto-fill until the user types their own
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResult({ url: candidate, preview: null });
      }
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [candidate]);

  const settled = candidate !== "" && result?.url === candidate;
  const preview = settled ? result!.preview : null;
  const previewState: "idle" | "loading" | "error" = !candidate ? "idle" : !settled ? "loading" : result!.preview ? "idle" : "error";

  const pickFiles = useCallback(async (picked: Iterable<File> | null | undefined) => {
    const list = Array.from(picked ?? []).filter((f) => f.type.startsWith("image/") || f.name);
    if (!list.length) return;
    const room = MAX_MANUAL_PHOTOS - files.length;
    if (room <= 0) return setError(`You can add up to ${MAX_MANUAL_PHOTOS} photos.`);
    const ready: File[] = [];
    let err = "";
    for (const picked1 of list.slice(0, room)) {
      // validates, converts HEIC, downscales so all photos fit the serverless request limit together
      const { file: f, error } = await readPhotoFile(picked1, { maxBytes: PER_PHOTO_BYTES });
      if (f) ready.push(f);
      else err = error ?? "That image couldn't be used.";
    }
    if (list.length > room) err = `You can add up to ${MAX_MANUAL_PHOTOS} photos.`;
    setError(err);
    if (!ready.length) return;
    setFiles((cur) => [...cur, ...ready].slice(0, MAX_MANUAL_PHOTOS));
    setTitle((t) => t || list[0].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim());
  }, [files.length]);

  // Paste a copied picture straight into the Photo tab.
  useEffect(() => {
    if (mode !== "PHOTO") return;
    function onPaste(e: ClipboardEvent) {
      const fs = Array.from(e.clipboardData?.files ?? []).filter((x) => x.type.startsWith("image/"));
      if (fs.length) {
        e.preventDefault();
        void pickFiles(fs);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode, pickFiles]);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void pickFiles(e.dataTransfer.files);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.set("type", mode);
    form.set("title", title);
    form.set("description", description);
    form.set("tags", JSON.stringify(tags));
    if (mode === "LINK") {
      if (!url.trim()) return setError("Paste a link first.");
      form.set("url", url.trim());
      if (own) {
        form.set("file", own);
        if (picks.length) form.set("imageUrls", JSON.stringify(picks.slice(0, MAX_PHOTOS - 1)));
      } else {
        if (pick) form.set("imageUrl", pick);
        if (picks.length > 1) form.set("imageUrls", JSON.stringify(picks.slice(1, MAX_PHOTOS)));
      }
    } else {
      if (!files.length) return setError("Choose a photo to upload.");
      if (!title.trim()) return setError("Give your photo a title.");
      files.forEach((f) => form.append("file", f));
    }
    setBusy(true);
    try {
      const { item } = await api<{ item: ItemDTO }>(`/api/shelves/${shelf.id}/items`, { form });
      onAdded(item);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.code === "ITEM_LIMIT" && onLimit) return onLimit();
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
      <form onSubmit={submit} className="space-y-5" data-testid="add-item-form">
        <Tabs
          label="Item type"
          spread
          className="bg-surface-hover"
          value={mode}
          onChange={(m) => { setMode(m); setError(""); }}
          options={[
            { value: "LINK", label: <><Link2 className="size-4" aria-hidden /> Link</> },
            { value: "PHOTO", label: <><ImageIcon className="size-4" aria-hidden /> Photo</> },
          ]}
        />

        {mode === "LINK" ? (
          <div className="space-y-4">
            <Field label="Link" htmlFor="item-url">
              <Input id="item-url" name="url" data-autofocus type="url" inputMode="url" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Paste a link" value={url} onChange={(e) => { setUrl(e.target.value); titleTouched.current = false; }} onPaste={() => { instant.current = true; }} />
            </Field>
            {previewState === "loading" && (
              <div data-testid="preview-skeleton" aria-busy="true" aria-label="Fetching preview" className="overflow-hidden rounded-2xl border border-border">
                <Skeleton className="aspect-[16/10] w-full rounded-none sm:aspect-[16/7]" />
                <div className="space-y-2 p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div>
              </div>
            )}
            {previewState === "error" && <p className="text-meta text-muted">Couldn’t read that page. You can still add it, and pick your own photo below.</p>}
            {(preview || previewState === "error") && previewState !== "loading" && (
              <>
                {preview && (
                  <div data-testid="link-preview" className="overflow-hidden rounded-2xl border border-border bg-surface-hover">
                    <div className="grid aspect-[16/10] place-items-center overflow-hidden bg-surface sm:aspect-[16/7]">
                      {ownUrl || pick || preview.image || preview.favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          data-testid="link-preview-image"
                          src={ownUrl ?? shownSrc(preview, pick)}
                          alt=""
                          className={clsx("h-full w-full", ownUrl || pick || preview.image ? "object-contain" : "max-w-24 object-contain p-4")}
                        />
                      ) : (
                        <ImageIcon className="size-8 text-muted" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 p-3">
                      <p className="line-clamp-2 text-meta font-semibold">{preview.title || preview.siteName}</p>
                      <p className="mt-0.5 line-clamp-2 text-caption text-muted">{preview.description || "No description found"}</p>
                      <p className="mt-1 text-micro text-muted">{preview.siteName}</p>
                    </div>
                  </div>
                )}
                <PhotoPicker
                  candidates={preview?.candidates ?? []}
                  selected={pick}
                  multi={{ picks, max: MAX_PHOTOS }}
                  onSelect={(u) =>
                    setPicks((cur) =>
                      cur.includes(u) ? cur.filter((x) => x !== u) : cur.length + (own ? 1 : 0) >= MAX_PHOTOS ? cur : [...cur, u],
                    )
                  }
                  ownUrl={ownUrl}
                  onOwn={setOwn}
                  onClearOwn={() => setOwn(null)}
                  onError={setError}
                />
              </>
            )}
          </div>
        ) : (
          <div>
            {files.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fileInput.current?.click())}
                className={clsx(
                  "grid cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                  dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-accent/60 hover:bg-surface-hover",
                )}
              >
                <div>
                  <Camera className="mx-auto size-9 text-accent" aria-hidden strokeWidth={1.6} />
                  <p className="mt-2 font-medium">Drop, paste or choose up to {MAX_MANUAL_PHOTOS} photos</p>
                  <p className="text-caption text-muted">JPG, PNG, WebP or GIF · up to {MAX_MB}MB each</p>
                </div>
              </div>
            ) : (
              <div
                data-testid="photo-tiles"
                className={clsx("grid grid-cols-3 gap-2 rounded-2xl transition sm:gap-3", dragOver && "ring-2 ring-accent ring-offset-2 ring-offset-surface")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {filePreviews.map((src, i) => (
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-hover">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-micro font-semibold text-foreground shadow-sm">Cover</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFiles((cur) => [cur[i], ...cur.filter((_, n) => n !== i)])}
                        className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-surface/90 px-2 py-1 text-micro font-medium text-foreground opacity-100 shadow-sm transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        Make cover
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() => setFiles((cur) => cur.filter((_, n) => n !== i))}
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-foreground shadow-sm transition hover:bg-surface"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                {files.length < MAX_MANUAL_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted transition hover:border-accent/60 hover:bg-surface-hover hover:text-foreground"
                  >
                    <span className="flex flex-col items-center gap-1 text-caption font-medium">
                      <Plus className="size-5" aria-hidden />
                      Add photo
                    </span>
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInput}
              data-testid="photo-input"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void pickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && <p className="mt-2 text-caption text-muted">{files.length}/{MAX_MANUAL_PHOTOS} photos · the first one is the cover</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-1">
          <Field label="Title" htmlFor="item-title" hint={mode === "LINK" ? "leave blank to use the page title" : undefined}>
            <Input id="item-title" name="title" maxLength={120} value={title} onChange={(e) => { titleTouched.current = true; setTitle(e.target.value); }} placeholder={mode === "LINK" ? preview?.title || "Auto-filled from the page" : "Name this item"} />
          </Field>
          <Field label="Thoughts" htmlFor="item-desc" hint="optional">
            <Textarea id="item-desc" name="description" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={mode === "LINK" ? preview?.description || "Why do you love it?" : "Why do you love it?"} />
          </Field>
          <Field label="Tags" htmlFor="item-tags" hint="optional, press Enter to add">
            <TagInput id="item-tags" value={tags} onChange={setTags} />
          </Field>
        </div>

        {error && (
          <FormError>{error}</FormError>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} data-testid="add-item-submit">{busy ? (mode === "LINK" ? "Fetching preview…" : "Uploading…") : "Add to collection"}</Button>
        </div>
      </form>
  );
}
