"use client";

import clsx from "clsx";
import { Check, LayoutGrid, Link2, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ItemDTO, PageDTO, PublicUser, ShelfDTO, TimelineEntry, ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { MAX_SHELVES_PER_PAGE, pageCreationGate } from "@/lib/limits";
import { gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { AddItemDialog } from "./AddItemDialog";
import { ConfirmDialog, PageDialog, PaywallDialog, ProfileDialog, ShelfDialog } from "./dialogs";
import { ItemModal } from "./ItemModal";
import { PageSwitcher } from "./PageSwitcher";
import { ProfileStickyBar } from "./ProfileStickyBar";
import { ShelfView } from "./ShelfView";

interface Props {
  profile: {
    user: PublicUser;
    pages: PageDTO[];
    timeline: { items: TimelineEntry[]; nextCursor: string | null };
    stats: { followers: number; following: number; items: number };
    isFollowing: boolean;
    isOwner: boolean;
  };
  viewer: ViewerDTO | null;
  stripeEnabled: boolean;
  priceLabel: string;
  initialPageId?: string;
  initialItemId?: string;
}

function subscribeSm(cb: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function ProfileView({ profile, viewer, stripeEnabled, priceLabel, initialPageId, initialItemId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { isOwner } = profile;

  const [user, setUser] = useState(profile.user);
  const [pages, setPages] = useState(profile.pages);
  const [activeId, setActiveId] = useState(() => {
    if (initialItemId) {
      const owner = profile.pages.find((p) => p.shelves.some((s) => s.items.some((i) => i.id === initialItemId)));
      if (owner) return owner.id;
    }
    return profile.pages.some((p) => p.id === initialPageId) ? initialPageId! : profile.pages[0]?.id;
  });
  const [stats, setStats] = useState(profile.stats);
  const [following, setFollowing] = useState(profile.isFollowing);
  const [subscribed, setSubscribed] = useState(viewer?.subscribed ?? false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // dialogs
  const [pageDialog, setPageDialog] = useState<{ page: PageDTO | null } | null>(null);
  const [shelfDialog, setShelfDialog] = useState<{ shelf: ShelfDTO | null } | null>(null);
  const [addTo, setAddTo] = useState<ShelfDTO | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(initialItemId ?? null);
  const [paywall, setPaywall] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "shelf" | "page"; id: string; name: string }>(null);

  // Owners: quietly retry thumbnails for link items that were saved without one (older items, flaky sites).
  const thumbsTried = useRef(false);
  useEffect(() => {
    if (!isOwner || thumbsTried.current) return;
    thumbsTried.current = true;
    const missing = profile.pages.flatMap((p) => p.shelves).flatMap((sh) => sh.items).filter((i) => i.type === "LINK" && !i.imageUrl && i.url).slice(0, 6);
    if (!missing.length) return;
    (async () => {
      for (const it of missing) {
        try {
          const { item } = await api<{ item: ItemDTO }>(`/api/items/${it.id}/thumbnail`, { method: "POST", json: {} });
          if (!item.imageUrl && !item.faviconUrl) continue;
          setPages((ps) => ps.map((p) => ({ ...p, shelves: p.shelves.map((sh) => (sh.id === item.shelfId ? { ...sh, items: sh.items.map((i) => (i.id === item.id ? item : i)) } : sh)) })));
        } catch {
          /* best effort */
        }
      }
    })();
  }, [isOwner, profile.pages]);

  const captureFns = useRef<Record<string, () => void>>({});
  const registerCapture = useCallback((id: string, fn: (() => void) | null) => {
    if (fn) captureFns.current[id] = fn;
    else delete captureFns.current[id];
  }, []);
  const dragSnapshot = useRef<ItemDTO[] | null>(null);
  const header = useRef<HTMLDivElement>(null);
  const wide = useSyncExternalStore(subscribeSm, () => window.matchMedia("(min-width: 640px)").matches, () => false);
  const content = useRef<HTMLDivElement>(null);

  const page = pages.find((p) => p.id === activeId) ?? pages[0];
  const allShelves = pages.flatMap((p) => p.shelves);
  const openShelf = allShelves.find((s) => s.items.some((i) => i.id === openItemId)) ?? null;
  const openItem = openShelf?.items.find((i) => i.id === openItemId) ?? null;
  const locked = !pageCreationGate({ subscribed, pageCount: pages.length }).allowed;

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.from("[data-avatar]", { opacity: 0, duration: 0.35, ease: "power2.out" })
        .from("[data-head]", { y: 8, opacity: 0, stagger: 0.05, duration: 0.35 }, "-=0.2");
    },
    { scope: header },
  );

  useGSAP(
    () => {
      if (reducedMotion() || !content.current) return;
      gsap.from(content.current, { opacity: 0, duration: 0.3, ease: "power2.out", clearProps: "all" });
    },
    { scope: content, dependencies: [activeId] },
  );

  const selectPage = useCallback((id: string) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("page", id);
    window.history.replaceState(null, "", url);
  }, []);

  const patchShelf = (shelfId: string, fn: (s: ShelfDTO) => ShelfDTO) =>
    setPages((ps) => ps.map((p) => ({ ...p, shelves: p.shelves.map((s) => (s.id === shelfId ? fn(s) : s)) })));

  /* ---------- pages ---------- */
  function startCreatePage() {
    if (locked) return setPaywall(true);
    setPageDialog({ page: null });
  }
  function onPageSaved(saved: PageDTO, created: boolean) {
    setPageDialog(null);
    if (created) {
      setPages((ps) => [...ps, saved]);
      setActiveId(saved.id);
      const url = new URL(window.location.href);
      url.searchParams.set("page", saved.id);
      window.history.replaceState(null, "", url);
      toast.success(`Page “${saved.title}” created`);
    } else {
      setPages((ps) => ps.map((p) => (p.id === saved.id ? { ...p, title: saved.title, description: saved.description } : p)));
      toast.success("Page updated");
    }
  }

  /* ---------- shelves ---------- */
  function onShelfSaved(saved: ShelfDTO, created: boolean) {
    setShelfDialog(null);
    if (created) {
      setPages((ps) => ps.map((p) => (p.id === saved.pageId ? { ...p, shelves: [...p.shelves, saved] } : p)));
      toast.success(`Shelf “${saved.name}” added`);
    } else {
      patchShelf(saved.id, (s) => ({ ...s, name: saved.name }));
      toast.success("Shelf renamed");
    }
  }

  async function doDelete() {
    if (!confirm) return;
    if (confirm.kind === "shelf") {
      await api(`/api/shelves/${confirm.id}`, { method: "DELETE" });
      const removed = allShelves.find((s) => s.id === confirm.id);
      setPages((ps) => ps.map((p) => ({ ...p, shelves: p.shelves.filter((s) => s.id !== confirm.id) })));
      setStats((s) => ({ ...s, items: Math.max(0, s.items - (removed?.items.length ?? 0)) }));
      toast.success("Shelf deleted");
    } else {
      await api(`/api/pages/${confirm.id}`, { method: "DELETE" });
      const removed = pages.find((p) => p.id === confirm.id);
      const remaining = pages.filter((p) => p.id !== confirm.id);
      setPages(remaining);
      setStats((s) => ({ ...s, items: Math.max(0, s.items - (removed?.shelves.reduce((n, sh) => n + sh.items.length, 0) ?? 0)) }));
      if (activeId === confirm.id) selectPage(remaining[0].id);
      toast.success("Page deleted");
    }
    setConfirm(null);
  }

  /* ---------- items ---------- */
  function onItemAdded(item: ItemDTO) {
    const shelf = allShelves.find((s) => s.id === item.shelfId);
    const owningPage = pages.find((p) => p.shelves.some((s) => s.id === item.shelfId));
    if (!shelf || !owningPage) return;
    captureFns.current[shelf.id]?.();
    patchShelf(shelf.id, (s) => ({ ...s, items: [...s.items, item] }));
    setStats((s) => ({ ...s, items: s.items + 1 }));
    setAddTo(null);
    setJustAdded(item.id);
    toast.success(`Added “${item.title}” to ${shelf.name}`);
    setTimeout(() => {
      document.querySelector(`[data-flip-id="${item.id}"]`)?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    }, 60);
  }

  function onItemUpdated(item: ItemDTO) {
    patchShelf(item.shelfId, (s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? item : i)) }));
  }

  function onItemDeleted(item: ItemDTO) {
    captureFns.current[item.shelfId]?.();
    patchShelf(item.shelfId, (s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }));
    setStats((s) => ({ ...s, items: Math.max(0, s.items - 1) }));
    setOpenItemId(null);
  }

  const onReorder = useCallback(
    async (shelfId: string, items: ItemDTO[], commit: boolean) => {
      const shelf = pages.flatMap((p) => p.shelves).find((s) => s.id === shelfId);
      if (!shelf) return;
      if (!commit) {
        dragSnapshot.current ??= shelf.items;
        patchShelf(shelfId, (s) => ({ ...s, items: items.map((i, n) => ({ ...i, position: n })) }));
        return;
      }
      const snapshot = dragSnapshot.current;
      dragSnapshot.current = null;
      if (!snapshot || snapshot.map((i) => i.id).join() === items.map((i) => i.id).join()) return;
      try {
        await api(`/api/shelves/${shelfId}/reorder`, { json: { itemIds: items.map((i) => i.id) } });
      } catch (e) {
        captureFns.current[shelfId]?.();
        patchShelf(shelfId, (s) => ({ ...s, items: snapshot }));
        toast.error(e instanceof ApiError ? e.message : "Couldn't save the new order");
      }
    },
    [pages, toast],
  );

  function moveItem(item: ItemDTO, dir: -1 | 1) {
    const shelf = allShelves.find((s) => s.id === item.shelfId);
    if (!shelf) return;
    const i = shelf.items.findIndex((x) => x.id === item.id);
    const j = i + dir;
    if (j < 0 || j >= shelf.items.length) return;
    const next = [...shelf.items];
    [next[i], next[j]] = [next[j], next[i]];
    captureFns.current[shelf.id]?.();
    dragSnapshot.current = shelf.items;
    patchShelf(shelf.id, (s) => ({ ...s, items: next.map((x, n) => ({ ...x, position: n })) }));
    void onReorder(shelf.id, next, true);
  }

  /* ---------- follow ---------- */
  async function toggleFollow() {
    if (!viewer) return router.push(`/login`);
    const next = !following;
    setFollowing(next);
    setStats((s) => ({ ...s, followers: s.followers + (next ? 1 : -1) }));
    try {
      await api(`/api/users/${user.username}/follow`, { method: next ? "POST" : "DELETE" });
    } catch (err) {
      setFollowing(!next);
      setStats((s) => ({ ...s, followers: s.followers + (next ? -1 : 1) }));
      toast.error(err instanceof ApiError ? err.message : "Couldn't update follow");
    }
  }

  const shelfCount = page?.shelves.length ?? 0;
  const atLimit = shelfCount >= MAX_SHELVES_PER_PAGE;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      {/* ---------------------------------------------------------- header (Instagram layout) */}
      <div
        ref={header}
        data-testid="profile-header"
        className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-4 py-6 sm:gap-x-14 sm:gap-y-3 sm:py-10 md:mx-auto md:max-w-3xl"
      >
        <span data-avatar className="inline-block justify-self-center sm:row-span-3">
          <Avatar name={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size={wide ? 160 : 88} className="shadow-xl ring-4 ring-surface" />
        </span>
        <div data-head className="min-w-0 space-y-3 sm:self-end">
          <div className="min-w-0">
            <h1 className="truncate text-heading font-semibold tracking-tight sm:text-title">{user.displayName}</h1>
            <p className="truncate text-meta text-muted">@{user.username}</p>
          </div>
          <div className="flex gap-5 text-meta sm:gap-8">
            <span data-stat><strong className="font-semibold">{stats.items}</strong> <span className="text-muted">items</span></span>
            <span data-stat><strong className="font-semibold">{stats.followers}</strong> <span className="text-muted">followers</span></span>
            <span data-stat><strong className="font-semibold">{stats.following}</strong> <span className="text-muted">following</span></span>
          </div>
        </div>
        <div data-head className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-2 sm:self-center">
          {isOwner ? (
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => setProfileDialog(true)}><Pencil className="size-4" aria-hidden /> Edit profile</Button>
          ) : (
            <Button size="sm" variant={following ? "secondary" : "primary"} className="flex-1 sm:flex-none sm:min-w-28" onClick={toggleFollow} data-testid="follow-button">
              {following ? <><Check className="size-4" aria-hidden strokeWidth={2.4} /> Following</> : "Follow"}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={async () => {
              const link = `${window.location.origin}/u/${user.username}`;
              try {
                await navigator.clipboard.writeText(link);
                toast.success("Profile link copied");
              } catch {
                toast.info(link);
              }
            }}
          >
            <Link2 className="size-4" aria-hidden /> Share
          </Button>
        </div>
        {user.bio && (
          <p data-head className="col-span-2 max-w-lg whitespace-pre-line text-body text-foreground/85 sm:col-span-1 sm:col-start-2 sm:self-start">{user.bio}</p>
        )}
      </div>

      {/* ------------------------------------------ collections label + sticky page switcher */}
      <div className="border-t border-border" />
      <ProfileStickyBar headerRef={header} displayName={user.displayName} username={user.username} avatarUrl={user.avatarUrl}>
        {page && <PageSwitcher pages={pages} activeId={page.id} onSelect={selectPage} isOwner={isOwner} locked={locked} onCreate={startCreatePage} />}
      </ProfileStickyBar>

      {/* --------------------------------------------------------- body */}
      <div ref={content} className="mt-6" key={activeId}>
        {page ? (
          <div className="space-y-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-3 text-title font-semibold tracking-tight" data-testid="page-title">
                  {page.title}
                </h2>
                {page.description && <p className="mt-1 max-w-2xl text-muted">{page.description}</p>}
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <span className="text-caption text-muted" data-testid="shelf-count">{shelfCount}/{MAX_SHELVES_PER_PAGE} shelves</span>
                  <Menu
                    label="Page actions"
                    items={[
                      { label: "Edit page", onSelect: () => setPageDialog({ page }) },
                      { label: "Delete page", danger: true, hidden: pages.length <= 1, onSelect: () => setConfirm({ kind: "page", id: page.id, name: page.title }) },
                    ]}
                    trigger={({ props }) => (
                      <IconButton label="Page actions" size="sm" {...props}>
                        <MoreHorizontal className="size-4" aria-hidden />
                      </IconButton>
                    )}
                  />
                </div>
              )}
            </div>

            {page.shelves.length === 0 && (
              <EmptyState
                icon={<LayoutGrid className="size-10" aria-hidden strokeWidth={1.5} />}
                title={isOwner ? "Build your first shelf" : "No shelves yet"}
                description={isOwner ? "A shelf holds one category — books, records, sneakers, bookmarks. Start with something you love." : "This page doesn’t have any shelves yet."}
                action={isOwner ? <Button onClick={() => setShelfDialog({ shelf: null })}>Add a shelf</Button> : undefined}
              />
            )}

            {page.shelves.map((shelf) => (
              <ShelfView
                key={shelf.id}
                shelf={shelf}
                isOwner={isOwner}
                justAddedId={justAdded}
                registerCapture={registerCapture}
                onOpenItem={(i) => setOpenItemId(i.id)}
                onAddItem={setAddTo}
                onEditShelf={(s) => setShelfDialog({ shelf: s })}
                onDeleteShelf={(s) => setConfirm({ kind: "shelf", id: s.id, name: s.name })}
                onReorder={onReorder}
              />
            ))}

            {isOwner && page.shelves.length > 0 && (
              <button
                onClick={() => (atLimit ? toast.info(`A page holds at most ${MAX_SHELVES_PER_PAGE} shelves. Delete one or start a new page.`) : setShelfDialog({ shelf: null }))}
                data-testid="add-shelf"
                aria-disabled={atLimit}
                className={clsx(
                  "flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed py-8 text-meta font-medium transition",
                  atLimit ? "cursor-not-allowed border-border text-muted" : "border-border text-muted hover:border-accent hover:bg-accent-subtle/40 hover:text-foreground",
                )}
              >
                {atLimit ? `Shelf limit reached (${MAX_SHELVES_PER_PAGE}/${MAX_SHELVES_PER_PAGE})` : <><Plus className="size-4" aria-hidden /> Add a shelf <span className="text-caption">({shelfCount}/{MAX_SHELVES_PER_PAGE})</span></>}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------ dialogs */}
      {isOwner && (
        <>
          <PageDialog open={Boolean(pageDialog)} page={pageDialog?.page ?? null} onClose={() => setPageDialog(null)} onSaved={onPageSaved} onPaywall={() => setPaywall(true)} />
          {page && <ShelfDialog open={Boolean(shelfDialog)} pageId={page.id} shelf={shelfDialog?.shelf ?? null} onClose={() => setShelfDialog(null)} onSaved={onShelfSaved} />}
          <AddItemDialog open={Boolean(addTo)} shelf={addTo} onClose={() => setAddTo(null)} onAdded={onItemAdded} />
          <ConfirmDialog
            open={Boolean(confirm)}
            title={confirm?.kind === "page" ? "Delete this page?" : "Delete this shelf?"}
            body={`“${confirm?.name ?? ""}” and everything on it will be permanently removed.`}
            confirmLabel="Delete"
            onClose={() => setConfirm(null)}
            onConfirm={doDelete}
          />
          {viewer && (
            <ProfileDialog
              open={profileDialog}
              viewer={{ ...viewer, displayName: user.displayName, bio: user.bio, avatarUrl: user.avatarUrl }}
              onClose={() => setProfileDialog(false)}
              onAvatar={(u) => {
                setUser((x) => ({ ...x, avatarUrl: u.avatarUrl }));
                toast.success(u.avatarUrl ? "Profile photo updated" : "Profile photo removed");
                router.refresh();
              }}
              onSaved={(u) => {
                setUser((x) => ({ ...x, displayName: u.displayName, bio: u.bio }));
                setProfileDialog(false);
                toast.success("Profile updated");
                router.refresh();
              }}
            />
          )}
          <PaywallDialog
            open={paywall}
            stripeEnabled={stripeEnabled}
            priceLabel={priceLabel}
            onClose={() => setPaywall(false)}
            onUpgraded={() => {
              setSubscribed(true);
              setPaywall(false);
              router.refresh();
              setTimeout(() => {
                setPageDialog({ page: null });
              }, 350);
            }}
          />
        </>
      )}
      <ItemModal
        item={openItem}
        shelf={openShelf}
        isOwner={isOwner}
        viewerId={viewer?.id}
        onClose={() => setOpenItemId(null)}
        onUpdated={onItemUpdated}
        onDeleted={onItemDeleted}
        onMove={moveItem}
      />
    </div>
  );
}
