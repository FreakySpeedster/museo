"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, Check, ImagePlus, Undo2 } from "lucide-react";
import { MAX_REQUEST_BYTES, prepareImage } from "@/lib/client-image";

export interface PhotoCandidate {
  url: string;
  width: number;
  height: number;
  source: string;
  /** Inline data URI thumbnail supplied by the server. */
  thumb?: string;
}

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 8;

/** Same-origin, size-reduced rendition of a remote candidate (shops often block hot-linking). */
export const proxied = (url: string) => `/api/preview/image?url=${encodeURIComponent(url)}`;

async function toJpeg(file: File): Promise<File | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}

/** Validate + downscale a picked/dropped/pasted image. Returns an error message instead of throwing. */
export async function readPhotoFile(picked: File, opts: { maxBytes?: number } = {}): Promise<{ file?: File; error?: string }> {
  if (!ACCEPT.includes(picked.type)) {
    // HEIC / AVIF / BMP from phones and clipboards: let the browser decode and re-encode as JPEG when it can.
    const converted = picked.type.startsWith("image/") ? await toJpeg(picked) : null;
    if (!converted) return { error: "Please choose a JPG, PNG, WebP or GIF image." };
    picked = converted;
  }
  if (picked.size > MAX_MB * 1024 * 1024) return { error: `That image is too large (max ${MAX_MB}MB).` };
  const file = await prepareImage(picked, opts.maxBytes);
  if (file.size > (opts.maxBytes ?? MAX_REQUEST_BYTES)) return { error: "That image is too large to upload. Try a smaller file." };
  return { file };
}

/**
 * Choose which photo represents a link: any detected candidate, or the user's own (file picker, camera on phones,
 * drag-and-drop or Ctrl/Cmd+V paste). `ownUrl` is an object URL preview of the user's photo, when one is set.
 */
export function PhotoPicker({
  candidates,
  selected,
  onSelect,
  ownUrl,
  onOwn,
  onClearOwn,
  onError,
  revertLabel = "Back to the link photo",
  className,
  multi,
}: {
  candidates: PhotoCandidate[];
  selected: string | null;
  onSelect: (url: string) => void;
  ownUrl: string | null;
  onOwn: (file: File) => void;
  onClearOwn: () => void;
  onError?: (message: string) => void;
  revertLabel?: string;
  className?: string;
  /** Multi-select: tap to add or remove photos; the order picked is the order shown (first is the cover). */
  multi?: { picks: string[]; max: number };
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const ownTile = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const take = useCallback(
    async (picked: File | undefined | null) => {
      if (!picked) return;
      const { file, error } = await readPhotoFile(picked);
      if (error) return onError?.(error);
      onError?.("");
      if (file) onOwn(file);
    },
    [onOwn, onError],
  );

  // Paste an image straight from the clipboard (screenshots, copied product photos).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        void take(f);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [take]);

  // Bring the freshly chosen own photo into view in the horizontal strip.
  useEffect(() => {
    if (ownUrl) ownTile.current?.scrollIntoView?.({ block: "nearest", inline: "start", behavior: "smooth" });
  }, [ownUrl]);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    void take(e.dataTransfer.files?.[0]);
  }

  const shown = candidates.filter((c) => !broken.has(c.url));
  const active = ownUrl ? null : selected ?? shown[0]?.url ?? null;
  const offset = ownUrl ? 1 : 0;
  const full = multi ? multi.picks.length + offset >= multi.max : false;

  return (
    <div
      data-testid="photo-picker"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={clsx("rounded-2xl border border-dashed p-3 transition", drag ? "border-accent bg-accent-subtle" : "border-border", className)}
    >
      <p className="mb-2 text-caption font-medium text-muted">{multi && shown.length > 1
          ? `Tap photos to add them (${multi.picks.length + offset}/${multi.max}). The first one is the cover.`
          : ownUrl ? "Using your own photo" : shown.length > 1 ? "Pick the photo to show" : "Photo"}</p>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {ownUrl && (
          <div ref={ownTile} className="relative size-16 shrink-0 snap-start overflow-hidden rounded-xl ring-2 ring-accent sm:size-[72px]" data-testid="own-photo-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ownUrl} alt="Your photo" className="h-full w-full object-cover" />
            <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-micro font-semibold text-accent-contrast">{multi ? 1 : <Check className="size-4" aria-hidden />}</span>
          </div>
        )}
        {shown.map((c, i) => {
          const order = multi ? multi.picks.indexOf(c.url) : -1;
          const on = multi ? order >= 0 : c.url === active;
          const dim = multi ? !on && full : Boolean(ownUrl);
          return (
            <button
              key={c.url}
              type="button"
              data-testid="photo-candidate"
              aria-pressed={on}
              aria-label={`Photo option ${i + 1}${c.width ? `, ${c.width} by ${c.height}` : ""}`}
              onClick={() => onSelect(c.url)}
              className={clsx("relative size-16 shrink-0 snap-start overflow-hidden rounded-xl bg-surface-hover outline-none transition focus-visible:ring-2 focus-visible:ring-accent sm:size-[72px]", on ? "ring-2 ring-accent" : "opacity-80 ring-1 ring-line hover:opacity-100", dim && "opacity-50")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumb ?? proxied(c.url)} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken((b) => new Set(b).add(c.url))} />
              {on && (
                <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-micro font-semibold text-accent-contrast">
                  {multi ? order + 1 + offset : <Check className="size-4" aria-hidden />}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="own-photo-button"
          onClick={() => fileInput.current?.click()}
          className="grid size-16 shrink-0 snap-start place-items-center rounded-xl border border-border bg-surface-hover px-1 text-center text-micro font-medium leading-tight text-muted transition hover:border-accent/60 hover:text-foreground sm:size-[72px]"
        >
          <span className="flex flex-col items-center gap-1"><ImagePlus className="size-5" aria-hidden />{ownUrl ? "Change" : "My photo"}</span>
        </button>
        <button
          type="button"
          data-testid="camera-button"
          onClick={() => cameraInput.current?.click()}
          className="grid size-16 shrink-0 snap-start place-items-center rounded-xl border border-border bg-surface-hover px-1 text-center text-micro font-medium leading-tight text-muted transition hover:border-accent/60 hover:text-foreground sm:hidden"
        >
          <span className="flex flex-col items-center gap-1"><Camera className="size-5" aria-hidden />Camera</span>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-micro text-muted">Use my own photo: choose a file, take one, drop it here, or paste it.</p>
        {ownUrl && (
          <button type="button" data-testid="revert-photo" onClick={onClearOwn} className="inline-flex items-center gap-1 text-caption font-medium text-accent hover:underline">
            <Undo2 className="size-4" aria-hidden /> {revertLabel}
          </button>
        )}
      </div>
      <input ref={fileInput} data-testid="own-photo-input" type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
