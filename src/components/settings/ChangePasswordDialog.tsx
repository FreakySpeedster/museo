"use client";

import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { count } from "@/lib/plural";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Change password" description="You'll stay signed in here. Every other device will be signed out." size="sm">
      <ChangePasswordForm onClose={onClose} />
    </Modal>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const currentPassword = String(f.get("currentPassword") || "");
    const newPassword = String(f.get("newPassword") || "");
    if (!currentPassword) return setError("Enter your current password");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters");
    if (newPassword !== String(f.get("confirm") || "")) return setError("New passwords don't match");
    setBusy(true);
    try {
      const { signedOutOthers } = await api<{ signedOutOthers: number }>("/api/me/password", { json: { currentPassword, newPassword } });
      toast.success(signedOutOthers > 0 ? `Password changed. Signed out ${count(signedOutOthers, "other session")}.` : "Password changed");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Current password" htmlFor="pw-current">
        <Input id="pw-current" name="currentPassword" type="password" autoComplete="current-password" required autoFocus />
      </Field>
      <Field label="New password" htmlFor="pw-new" hint="min. 8 characters">
        <Input id="pw-new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm">
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      {error && <FormError>{error}</FormError>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy}>Update password</Button>
      </div>
    </form>
  );
}
