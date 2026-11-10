"use client";

import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { PageDTO, ShelfDTO, ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MAX_SHELVES_PER_PAGE } from "@/lib/limits";

const EMOJIS = ["📚", "🎧", "🎬", "🎮", "🎨", "📷", "👟", "🍜", "🧭", "💾", "🪴", "🛋️", "🧸", "🧪", "🌌", "🔥"];

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

const ErrorLine = ({ msg }: { msg: string }) =>
  msg ? (
    <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      {msg}
    </p>
  ) : null;

/* ------------------------------------------------------------------ Page */
export function PageDialog({
  open,
  page,
  onClose,
  onSaved,
  onPaywall,
}: {
  open: boolean;
  page: PageDTO | null; // null => create
  onClose: () => void;
  onSaved: (page: PageDTO, created: boolean) => void;
  onPaywall: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={page ? "Edit page" : "New page"} description={page ? undefined : "A page groups related shelves — like “Music” or “Travel”."}>
      <PageForm page={page} onClose={onClose} onSaved={onSaved} onPaywall={onPaywall} />
    </Modal>
  );
}

function PageForm({ page, onClose, onSaved, onPaywall }: { page: PageDTO | null; onClose: () => void; onSaved: (page: PageDTO, created: boolean) => void; onPaywall: () => void }) {
  const [emoji, setEmoji] = useState(page?.emoji ?? "📚");
  const { busy, error, run } = useSubmit();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = { title: f.get("title"), description: f.get("description") || "", emoji };
    run(async () => {
      try {
        const res = page
          ? await api<{ page: PageDTO }>(`/api/pages/${page.id}`, { method: "PATCH", json: body })
          : await api<{ page: PageDTO }>("/api/pages", { json: body });
        onSaved(res.page, !page);
      } catch (err) {
        if (err instanceof ApiError && err.code === "PAYWALL") {
          onClose();
          onPaywall();
          return;
        }
        throw err;
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" htmlFor="page-title">
        <Input id="page-title" name="title" data-autofocus required maxLength={60} defaultValue={page?.title} placeholder="e.g. Vinyl & Hi-Fi" />
      </Field>
      <Field label="Description" htmlFor="page-desc" hint="optional">
        <Textarea id="page-desc" name="description" maxLength={240} rows={3} defaultValue={page?.description} placeholder="What’s this page about?" />
      </Field>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Icon</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Page icon">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              onClick={() => setEmoji(e)}
              className={clsx("grid size-10 place-items-center rounded-xl border text-xl transition", emoji === e ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2")}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <ErrorLine msg={error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={busy}>{page ? "Save changes" : "Create page"}</Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- Shelf */
export function ShelfDialog({
  open,
  pageId,
  shelf,
  onClose,
  onSaved,
}: {
  open: boolean;
  pageId: string;
  shelf: ShelfDTO | null; // null => create
  onClose: () => void;
  onSaved: (shelf: ShelfDTO, created: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={shelf ? "Rename shelf" : "New shelf"}
      description={shelf ? undefined : `Each shelf holds one category. A page can have up to ${MAX_SHELVES_PER_PAGE} shelves.`}
    >
      <ShelfForm pageId={pageId} shelf={shelf} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function ShelfForm({ pageId, shelf, onClose, onSaved }: { pageId: string; shelf: ShelfDTO | null; onClose: () => void; onSaved: (shelf: ShelfDTO, created: boolean) => void }) {
  const { busy, error, run } = useSubmit();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      const res = shelf
        ? await api<{ shelf: ShelfDTO }>(`/api/shelves/${shelf.id}`, { method: "PATCH", json: { name: f.get("name") } })
        : await api<{ shelf: ShelfDTO }>(`/api/pages/${pageId}/shelves`, { json: { name: f.get("name"), category: f.get("category") } });
      onSaved(res.shelf, !shelf);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Shelf name" htmlFor="shelf-name">
        <Input id="shelf-name" name="name" data-autofocus required maxLength={40} defaultValue={shelf?.name} placeholder="e.g. Currently reading" />
      </Field>
      {!shelf && (
        <Field label="Category" htmlFor="shelf-cat" hint="everything on this shelf fits it">
          <Select id="shelf-cat" name="category" defaultValue="books">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </Select>
        </Field>
      )}
      <ErrorLine msg={error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={busy}>{shelf ? "Save" : "Create shelf"}</Button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- Confirm */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <ConfirmBody body={body} confirmLabel={confirmLabel} onClose={onClose} onConfirm={onConfirm} />
    </Modal>
  );
}

function ConfirmBody({ body, confirmLabel, onClose, onConfirm }: { body: string; confirmLabel: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const { busy, error, run } = useSubmit();
  return (
    <>
      <p className="text-sm text-muted">{body}</p>
      <div className="mt-4"><ErrorLine msg={error} /></div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={() => run(onConfirm)}>{confirmLabel}</Button>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Profile */
export function ProfileDialog({
  open,
  viewer,
  onClose,
  onSaved,
}: {
  open: boolean;
  viewer: ViewerDTO;
  onClose: () => void;
  onSaved: (u: ViewerDTO) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <ProfileForm viewer={viewer} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function ProfileForm({ viewer, onClose, onSaved }: { viewer: ViewerDTO; onClose: () => void; onSaved: (u: ViewerDTO) => void }) {
  const { busy, error, run } = useSubmit();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      const { user } = await api<{ user: ViewerDTO }>("/api/me", { method: "PATCH", json: { displayName: f.get("displayName"), bio: f.get("bio") || "" } });
      onSaved(user);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Display name" htmlFor="pf-name">
        <Input id="pf-name" name="displayName" data-autofocus required maxLength={50} defaultValue={viewer.displayName} />
      </Field>
      <Field label="Bio" htmlFor="pf-bio" hint="optional">
        <Textarea id="pf-bio" name="bio" maxLength={240} rows={3} defaultValue={viewer.bio} placeholder="Tell people what you collect." />
      </Field>
      <ErrorLine msg={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={busy}>Save</Button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- Paywall */
export function PaywallDialog({
  open,
  stripeEnabled,
  priceLabel,
  onClose,
  onUpgraded,
}: {
  open: boolean;
  stripeEnabled: boolean;
  priceLabel: string;
  onClose: () => void;
  onUpgraded: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Create more pages with Plus" description="Your first page is free forever. Plus unlocks the rest.">
      <PaywallBody stripeEnabled={stripeEnabled} priceLabel={priceLabel} onClose={onClose} onUpgraded={onUpgraded} />
    </Modal>
  );
}

function PaywallBody({ stripeEnabled, priceLabel, onClose, onUpgraded }: { stripeEnabled: boolean; priceLabel: string; onClose: () => void; onUpgraded: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();

  function upgrade() {
    run(async () => {
      if (stripeEnabled) {
        const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: {} });
        window.location.href = url;
        return;
      }
      await api("/api/billing/demo-upgrade", { method: "POST", json: {} });
      toast.success("Shelfie Plus unlocked (demo mode) 🎉");
      onUpgraded();
    });
  }

  const perks = [
    ["📄", "Unlimited extra pages", "Music, travel, sneakers… give every collection its own page."],
    ["⚡", "Switch pages instantly", "Your page switcher shows everything you curate."],
    ["💛", "Support an indie product", "Plus keeps Shelfie ad-free and tracker-free."],
  ];

  return (
      <div data-testid="paywall" className="space-y-5">
        <ul className="space-y-3">
          {perks.map(([icon, t, d]) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-lg">{icon}</span>
              <div>
                <p className="font-medium leading-tight">{t}</p>
                <p className="text-sm text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between rounded-2xl border border-line bg-surface-2 p-4">
          <div>
            <p className="text-sm text-muted">Shelfie Plus</p>
            <p className="text-3xl font-semibold tracking-tight">{priceLabel}</p>
          </div>
          <p className="text-xs text-muted">Cancel anytime</p>
        </div>
        {!stripeEnabled && (
          <p className="rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <strong>Demo mode:</strong> Stripe isn’t configured, so upgrading just flags this account as subscribed. No payment is taken.
          </p>
        )}
        <ErrorLine msg={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button loading={busy} onClick={upgrade} data-testid="upgrade-button">
            {stripeEnabled ? "Upgrade with Stripe" : "Upgrade (demo mode)"}
          </Button>
        </div>
      </div>
  );
}
