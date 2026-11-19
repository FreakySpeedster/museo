"use client";

import { ChevronLeft, ChevronRight, Gem, LayoutGrid, NotebookPen, Plus, SquarePlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { ItemDTO, PageDTO, ShelfDTO } from "@/lib/dto";
import { api } from "@/lib/client";
import { FREE_ITEMS_PER_SHELF, MAX_SHELVES_PER_PAGE } from "@/lib/limits";
import { count } from "@/lib/plural";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { AddItemDialog } from "@/components/profile/AddItemDialog";
import { ShelfDialog } from "@/components/profile/dialogs";

/** Window events so an open profile can patch its state in place instead of refetching. */
export const ITEM_ADDED_EVENT = "museo:item-added";
export const SHELF_SAVED_EVENT = "museo:shelf-saved";

type Step = "menu" | "pick" | "page" | "upsell";

/**
 * The phone tab bar's central "+": one sheet for everything you can make.
 * Add item asks which collection (or makes one first); Write post is Plus-only and upsells otherwise.
 */
export function CreateSheet({ open, onClose, username, subscribed }: { open: boolean; onClose: () => void; username: string; subscribed: boolean }) {
  const router = useRouter();
  const path = usePathname() ?? "/";
  const toast = useToast();
  const [step, setStep] = useState<Step>("menu");
  const [pages, setPages] = useState<PageDTO[] | null>(null);
  const [then, setThen] = useState<"add" | "none">("none");
  const [newShelfPage, setNewShelfPage] = useState<string | null>(null);
  const [addTo, setAddTo] = useState<ShelfDTO | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    api<{ pages: PageDTO[] }>("/api/pages")
      .then((r) => live && setPages(r.pages))
      .catch(() => live && setPages([]));
    return () => {
      live = false;
    };
  }, [open]);

  const shelves = (pages ?? []).flatMap((p) => p.shelves.map((s) => ({ ...s, pageTitle: p.title })));
  const roomyPages = (pages ?? []).filter((p) => p.shelves.length < MAX_SHELVES_PER_PAGE);
  const onProfile = path.toLowerCase().startsWith(`/u/${username.toLowerCase()}`);

  function close() {
    onClose();
    setTimeout(() => setStep("menu"), 250);
  }

  function startNewShelf(after: "add" | "none") {
    setThen(after);
    if (!pages) return;
    if (roomyPages.length === 0) return toast.info(`Every page already has ${MAX_SHELVES_PER_PAGE} collections. Start a new page from your profile.`);
    if (roomyPages.length === 1) {
      close();
      setNewShelfPage(roomyPages[0].id);
    } else setStep("page");
  }

  function pickShelf(s: ShelfDTO) {
    if (!subscribed && s.items.length >= FREE_ITEMS_PER_SHELF) return setStep("upsell");
    close();
    setAddTo(s);
  }

  function onShelfSaved(shelf: ShelfDTO, created: boolean) {
    setNewShelfPage(null);
    window.dispatchEvent(new CustomEvent(SHELF_SAVED_EVENT, { detail: { shelf, created } }));
    setPages((ps) => ps?.map((p) => (p.id === shelf.pageId ? { ...p, shelves: [...p.shelves, shelf] } : p)) ?? ps);
    if (then === "add") setAddTo(shelf);
    else if (!onProfile) router.push(`/u/${username}?page=${shelf.pageId}`);
    toast.success(`Created “${shelf.name}”`);
  }

  function onAdded(item: ItemDTO) {
    const shelf = addTo;
    setAddTo(null);
    window.dispatchEvent(new CustomEvent(ITEM_ADDED_EVENT, { detail: item }));
    if (!onProfile) {
      toast.success(`Added “${item.title}”${shelf ? ` to ${shelf.name}` : ""}`);
      router.push(`/i/${item.id}`);
    }
  }

  const title = step === "pick" ? "Add to which collection?" : step === "page" ? "Which page?" : step === "upsell" ? "Museo Plus" : "Create";
  return (
    <>
      <Modal open={open} onClose={close} title={title} size="sm">
        {step !== "menu" && (
          <button type="button" onClick={() => setStep("menu")} className="-mt-2 mb-2 inline-flex h-11 items-center gap-1 rounded-full pr-3 text-meta text-muted hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> Back
          </button>
        )}
        {step === "menu" && (
          <ul className="-mx-2 space-y-1" data-testid="create-sheet">
            <Row icon={<SquarePlus className="size-5" aria-hidden />} title="Add item" sub="From a link or your photos" onClick={() => setStep("pick")} testId="create-item" />
            <Row icon={<LayoutGrid className="size-5" aria-hidden />} title="New collection" sub="A home for one category" onClick={() => startNewShelf("none")} testId="create-collection" />
            <Row
              icon={<NotebookPen className="size-5" aria-hidden />}
              title="Write post"
              sub="Review or tell the story of an item"
              badge={subscribed ? undefined : <Badge>Plus</Badge>}
              onClick={() => {
                if (!subscribed) return setStep("upsell");
                close();
                router.push("/blog/new");
              }}
              testId="create-post"
            />
          </ul>
        )}
        {step === "pick" &&
          (pages === null ? (
            <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
          ) : (
            <ul className="-mx-2 space-y-1" data-testid="create-pick">
              {shelves.map((s) => (
                <Row
                  key={s.id}
                  icon={<CategoryIcon category={s.category} className="size-5" />}
                  title={s.name}
                  sub={`${pages.length > 1 ? `${s.pageTitle} · ` : ""}${count(s.items.length, "item")}`}
                  badge={!subscribed && s.items.length >= FREE_ITEMS_PER_SHELF ? <Badge tone="warning">Full</Badge> : undefined}
                  onClick={() => pickShelf(s)}
                />
              ))}
              <Row icon={<Plus className="size-5" aria-hidden />} title="New collection" sub={shelves.length ? "Make one, then add to it" : "You need a collection first"} onClick={() => startNewShelf("add")} testId="create-pick-new" />
            </ul>
          ))}
        {step === "page" && (
          <ul className="-mx-2 space-y-1">
            {roomyPages.map((p) => (
              <Row
                key={p.id}
                icon={<LayoutGrid className="size-5" aria-hidden />}
                title={p.title}
                sub={`${p.shelves.length}/${MAX_SHELVES_PER_PAGE} collections`}
                onClick={() => {
                  close();
                  setNewShelfPage(p.id);
                }}
              />
            ))}
          </ul>
        )}
        {step === "upsell" && (
          <div className="space-y-4 text-center" data-testid="create-upsell">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-subtle text-foreground"><Gem className="size-6" aria-hidden /></span>
            <div>
              <p className="text-body font-semibold">Write posts and keep collecting</p>
              <p className="mt-1 text-meta text-muted">Museo Plus adds the blog, removes the {FREE_ITEMS_PER_SHELF}-item limit and gives you more pages.</p>
            </div>
            <LinkButton href="/pricing" className="w-full" onClick={close}>See Museo Plus</LinkButton>
          </div>
        )}
      </Modal>
      {newShelfPage && <ShelfDialog open pageId={newShelfPage} shelf={null} onClose={() => setNewShelfPage(null)} onSaved={onShelfSaved} />}
      <AddItemDialog open={Boolean(addTo)} shelf={addTo} onClose={() => setAddTo(null)} onAdded={onAdded} onLimit={() => setAddTo(null)} />
    </>
  );
}

function Row({ icon, title, sub, badge, onClick, testId }: { icon: ReactNode; title: string; sub: string; badge?: ReactNode; onClick: () => void; testId?: string }) {
  return (
    <li>
      <button type="button" onClick={onClick} data-testid={testId} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-hover text-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-body font-medium"><span className="truncate">{title}</span>{badge}</span>
          <span className="block truncate text-caption text-muted">{sub}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  );
}
