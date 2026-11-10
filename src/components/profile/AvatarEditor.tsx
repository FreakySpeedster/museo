"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { squareCrop } from "@/lib/client-image";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

/** Upload / replace / remove the profile photo. Images are cropped to a square in the browser first. */
export function AvatarEditor({ viewer, onChange }: { viewer: ViewerDTO; onChange: (u: ViewerDTO) => void }) {
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    setBusy("upload");
    try {
      const square = await squareCrop(file);
      const form = new FormData();
      form.set("file", square);
      const { user } = await api<{ user: ViewerDTO }>("/api/me/avatar", { method: "POST", form });
      onChange(user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't use that image. Try a different one.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy("remove");
    setError("");
    try {
      const { user } = await api<{ user: ViewerDTO }>("/api/me/avatar", { method: "DELETE" });
      onChange(user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't remove the photo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-4" data-testid="avatar-editor">
      <Avatar name={viewer.displayName} username={viewer.username} avatarUrl={viewer.avatarUrl} size={72} className="shadow-lg ring-4 ring-surface" />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" loading={busy === "upload"} onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden /> {viewer.avatarUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {viewer.avatarUrl && (
            <Button type="button" size="sm" variant="ghost" loading={busy === "remove"} onClick={remove} className="hover:text-red-600">
              <Trash2 className="size-4" aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">JPG, PNG, WebP or GIF. We crop it to a square.</p>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label="Profile photo" data-testid="avatar-input" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
