"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { ItemDTO, ShelfDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { categoryMeta } from "@/lib/categories";
import { MAX_REQUEST_BYTES, prepareImage } from "@/lib/client-image";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";

interface Preview { url: string; title: string; description: string; siteName: string; image: string | null; favicon: string | null }

const MAX_MB = 8;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function AddItemDialog({
  open,
  shelf,
  onClose,
  onAdded,
}: {
  open: boolean;
  shelf: ShelfDTO | null;
  onClose: () => void;
  onAdded: (item: ItemDTO) => void;
}) {
  const meta = shelf ? categoryMeta(shelf.category) : null;
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add to your shelf" description={shelf ? `${meta?.emoji} ${shelf.name}` : undefined}>
      {shelf && <AddItemForm shelf={shelf} onClose={onClose} onAdded={onAdded} />}
    </Modal>
  );
}

function AddItemForm({ shelf, onClose, onAdded }: { shelf: ShelfDTO; onClose: () => void; onAdded: (item: ItemDTO) => void }) {
  const [mode, setMode] = useState<"LINK" | "PHOTO">("LINK");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ url: string; preview: Preview | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  // Live link preview (debounced). State is only set from async callbacks.
  const candidate = mode === "LINK" && url.trim().length >= 4 && url.includes(".") ? url.trim() : "";
  useEffect(() => {
    if (!candidate) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(candidate)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResult({ url: candidate, preview: res.ok ? data.preview : null });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResult({ url: candidate, preview: null });
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [candidate]);

  const settled = candidate !== "" && result?.url === candidate;
  const preview = settled ? result!.preview : null;
  const previewState: "idle" | "loading" | "error" = !candidate ? "idle" : !settled ? "loading" : result!.preview ? "idle" : "error";

  const pickFile = useCallback(async (picked: File | undefined | null) => {
    if (!picked) return;
    if (!ACCEPT.includes(picked.type)) return setError("Please choose a JPG, PNG, WebP or GIF image.");
    if (picked.size > MAX_MB * 1024 * 1024) return setError(`That image is too large (max ${MAX_MB}MB).`);
    const f = await prepareImage(picked); // downscales big photos so they fit serverless body limits
    if (f.size > MAX_REQUEST_BYTES) return setError("That image is too large to upload. Try a smaller file (GIFs must be under 4MB).");
    setError("");
    setFile(f);
    setTitle((t) => t || picked.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim());
  }, []);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.set("type", mode);
    form.set("title", title);
    form.set("description", description);
    if (mode === "LINK") {
      if (!url.trim()) return setError("Paste a link first.");
      form.set("url", url.trim());
    } else {
      if (!file) return setError("Choose a photo to upload.");
      if (!title.trim()) return setError("Give your photo a title.");
      form.set("file", file);
    }
    setBusy(true);
    try {
      const { item } = await api<{ item: ItemDTO }>(`/api/shelves/${shelf.id}/items`, { form });
      onAdded(item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const tab = (m: "LINK" | "PHOTO", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => {
        setMode(m);
        setError("");
      }}
      className={clsx("flex-1 rounded-full px-4 py-2 text-sm font-medium transition", mode === m ? "bg-ink text-bg shadow" : "text-muted hover:text-ink")}
    >
      {label}
    </button>
  );

  return (
      <form onSubmit={submit} className="space-y-5" data-testid="add-item-form">
        <div role="tablist" className="flex rounded-full border border-line bg-surface-2 p-1">
          {tab("LINK", "🔗 Link")}
          {tab("PHOTO", "🖼️ Photo")}
        </div>

        {mode === "LINK" ? (
          <div className="space-y-4">
            <Field label="Link" htmlFor="item-url">
              <Input id="item-url" name="url" data-autofocus inputMode="url" autoComplete="off" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            {previewState === "loading" && (
              <div className="flex gap-3 rounded-2xl border border-line p-3">
                <Skeleton className="h-20 w-28 shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
              </div>
            )}
            {previewState === "error" && <p className="text-sm text-muted">Couldn’t read that page — you can still add it and fill in the details yourself.</p>}
            {preview && previewState === "idle" && (
              <div data-testid="link-preview" className="flex gap-3 overflow-hidden rounded-2xl border border-line bg-surface-2 p-3">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {preview.image || preview.favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.image ?? preview.favicon ?? ""} alt="" className={clsx("h-full w-full", preview.image ? "object-cover" : "object-contain p-4")} />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{preview.title || preview.siteName}</p>
                  <p className="line-clamp-2 text-xs text-muted">{preview.description || "No description found"}</p>
                  <p className="mt-1 text-[11px] text-muted">{preview.siteName}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
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
                "grid cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition",
                dragOver ? "border-accent bg-accent-soft" : "border-line hover:border-accent/60 hover:bg-surface-2",
                filePreview ? "p-0" : "px-6 py-10",
              )}
            >
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="Selected photo preview" className="max-h-64 w-full object-contain" />
              ) : (
                <div>
                  <div className="text-4xl">📸</div>
                  <p className="mt-2 font-medium">Drop a photo here, or click to browse</p>
                  <p className="text-xs text-muted">JPG, PNG, WebP or GIF · up to {MAX_MB}MB</p>
                </div>
              )}
            </div>
            <input ref={fileInput} data-testid="photo-input" type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            {file && (
              <button type="button" className="mt-2 text-xs text-muted underline" onClick={() => setFile(null)}>
                Remove photo
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-1">
          <Field label="Title" htmlFor="item-title" hint={mode === "LINK" ? "leave blank to use the page title" : undefined}>
            <Input id="item-title" name="title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "LINK" ? preview?.title || "Auto-filled from the page" : "Name this item"} />
          </Field>
          <Field label="Description" htmlFor="item-desc" hint="optional">
            <Textarea id="item-desc" name="description" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={mode === "LINK" ? preview?.description || "Why do you love it?" : "Why do you love it?"} />
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} data-testid="add-item-submit">{busy ? (mode === "LINK" ? "Fetching preview…" : "Uploading…") : "Add to shelf"}</Button>
        </div>
      </form>
  );
}
