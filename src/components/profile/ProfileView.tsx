"use client";

import clsx from "clsx";
import { Check, Clock, LayoutGrid, MoreHorizontal, NotebookPen, Plus, Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ItemDTO, PageDTO, PublicUser, ShelfDTO, ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { FREE_ITEMS_PER_SHELF, MAX_SHELVES_PER_PAGE, pageCreationGate } from "@/lib/limits";
import { plural } from "@/lib/plural";
import { ITEM_ADDED_EVENT, SHELF_SAVED_EVENT } from "@/components/create/CreateSheet";
import { Tabs } from "@/components/ui/Tabs";
import { ProfilePosts } from "./ProfilePosts";
import { FollowListDialog, type ConnectionKind } from "@/components/social/FollowListDialog";
import { gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { AddItemDialog } from "./AddItemDialog";
import { ConfirmDialog, MoveShelfDialog, PageDialog, PaywallDialog, ProfileDialog, ShelfDialog, type PaywallReason } from "./dialogs";
import { ItemModal } from "./ItemModal";
import { PageSwitcher } from "./PageSwitcher";
import { ProfileStickyBar } from "./ProfileStickyBar";
import { ShelfView } from "./ShelfView";
import { BrandIcon, brandLabel } from "@/components/ui/BrandIcon";
import { VisibilityLock } from "@/components/ui/VisibilityLock";

interface Props {
  profile: {
    user: PublicUser;
    pages: PageDTO[];
    stats: { followers: number; following: number; items: number; posts?: number };
    isFollowing: boolean;
    followState: "none" | "requested" | "following";
    followPolicy?: "open" | "request";
    isOwner: boolean;
  };
  viewer: ViewerDTO | null;
  stripeEnabled: boolean;
  priceLabel: string;
  initialPageId?: string;
  initialItemId?: string;
  initialEdit?: boolean;
}

function subscribeSm(cb: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function ProfileView({ profile, viewer, stripeEnabled, priceLabel, initialPageId, initialItemId, initialEdit }: Props) {
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
  const [followState, setFollowState] = useState(profile.followState);
  const following = followState === "following";
  const [subscribed, setSubscribed] = useState(viewer?.subscribed ?? false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // dialogs
  const [pageDialog, setPageDialog] = useState<{ page: PageDTO | null } | null>(null);
  const [shelfDialog, setShelfDialog] = useState<{ shelf: ShelfDTO | null } | null>(null);
  const [addTo, setAddTo] = useState<ShelfDTO | null>(null);
  const [moveTarget, setMoveTarget] = useState<ShelfDTO | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(initialItemId ?? null);
  const [paywall, setPaywall] = useState<false | PaywallReason>(false);
  const [connections, setConnections] = useState<ConnectionKind | null>(null);
  const [profileDialog, setProfileDialog] = useState(Boolean(initialEdit && profile.isOwner));
  const [confirm, setConfirm] = useState<null | { kind: "shelf" | "page"; id: string; name: string }>(null);
  const [tab, setTab] = useState<"collections" | "posts">("collections");
  const showPostsTab = isOwner || (stats.posts ?? 0) > 0;

  // The phone Create sheet adds items / collections from anywhere; patch this profile in place when it's ours.
  useEffect(() => {
    if (!isOwner) return;
    const onItem = (e: Event) => {
      const item = (e as CustomEvent<ItemDTO>).detail;
      setPages((ps) => ps.map((p) => ({ ...p, shelves: p.shelves.map((sh) => (sh.id === item.shelfId && !sh.items.some((i) => i.id === item.id) ? { ...sh, items: [...sh.items, item] } : sh)) })));
      setStats((st) => ({ ...st, items: st.items + 1 }));
      setTab("collections");
      setJustAdded(item.id);
      toast.success(`Added “${item.title}”`);
      setTimeout(() => document.querySelector(`[data-flip-id="${item.id}"]`)?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }), 120);
    };
    const onShelf = (e: Event) => {
      const { shelf, created } = (e as CustomEvent<{ shelf: ShelfDTO; created: boolean }>).detail;
      if (!created) return;
      setPages((ps) => ps.map((p) => (p.id === shelf.pageId && !p.shelves.some((x) => x.id === shelf.id) ? { ...p, shelves: [...p.shelves, shelf] } : p)));
      setTab("collections");
      setActiveId(shelf.pageId);
    };
    window.addEventListener(ITEM_ADDED_EVENT, onItem);
    window.addEventListener(SHELF_SAVED_EVENT, onShelf);
    return () => {
      window.removeEventListener(ITEM_ADDED_EVENT, onItem);
      window.removeEventListener(SHELF_SAVED_EVENT, onShelf);
    };
  }, [isOwner, toast]);

  /** Phones push the item's own page (back, double-tap like, docked composer); desktop keeps the modal. */
  const openItemView = (i: ItemDTO) => {
    if (window.matchMedia("(max-width: 767.98px)").matches) router.push(`/i/${i.id}`);
    else setOpenItemId(i.id);
  };


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
    if (locked) return setPaywall("pages");
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
      setPages((ps) => ps.map((p) => (p.id === saved.id ? { ...p, title: saved.title, description: saved.description, visibility: saved.visibility } : p)));
      toast.success("Page updated");
    }
  }

  /* ---------- shelves ---------- */
  function onShelfSaved(saved: ShelfDTO, created: boolean) {
    setShelfDialog(null);
    if (created) {
      setPages((ps) => ps.map((p) => (p.id === saved.pageId ? { ...p, shelves: [...p.shelves, saved] } : p)));
      toast.success(`Collection “${saved.name}” added`);
    } else {
      patchShelf(saved.id, (s) => ({ ...s, name: saved.name, visibility: saved.visibility }));
      toast.success("Collection renamed");
    }
  }

  async function doDelete() {
    if (!confirm) return;
    if (confirm.kind === "shelf") {
      await api(`/api/shelves/${confirm.id}`, { method: "DELETE" });
      const removed = allShelves.find((s) => s.id === confirm.id);
      setPages((ps) => ps.map((p) => ({ ...p, shelves: p.shelves.filter((s) => s.id !== confirm.id) })));
      setStats((s) => ({ ...s, items: Math.max(0, s.items - (removed?.items.length ?? 0)) }));
      toast.success("Collection deleted");
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

  /** Free plan: a full collection opens the upsell instead of the add dialog. */
  function startAddItem(shelf: ShelfDTO) {
    if (!subscribed && shelf.items.length >= FREE_ITEMS_PER_SHELF) return setPaywall("items");
    setAddTo(shelf);
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

  async function persistPageOrder(pageIds: string[]) {
    const byId = new Map(pages.map((p) => [p.id, p]));
    setPages(pageIds.map((id) => byId.get(id)).filter((p): p is PageDTO => Boolean(p)));
    try {
      await api("/api/pages/reorder", { json: { pageIds } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save page order");
    }
  }

  async function moveShelf(shelf: ShelfDTO, dir: -1 | 1) {
    const owner = pages.find((p) => p.id === shelf.pageId);
    if (!owner) return;
    const i = owner.shelves.findIndex((s) => s.id === shelf.id);
    const j = i + dir;
    if (j < 0 || j >= owner.shelves.length) return;
    const next = [...owner.shelves];
    [next[i], next[j]] = [next[j], next[i]];
    setPages((ps) => ps.map((p) => (p.id === owner.id ? { ...p, shelves: next.map((s, n) => ({ ...s, position: n })) } : p)));
    try {
      await api(`/api/pages/${owner.id}/reorder-shelves`, { json: { shelfIds: next.map((s) => s.id) } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save collection order");
    }
  }

  function onShelfMoved(saved: ShelfDTO, fromPageId: string) {
    setPages((ps) =>
      ps.map((p) => {
        if (p.id === fromPageId) return { ...p, shelves: p.shelves.filter((s) => s.id !== saved.id).map((s, n) => ({ ...s, position: n })) };
        if (p.id === saved.pageId) return { ...p, shelves: [...p.shelves, saved] };
        return p;
      }),
    );
    setMoveTarget(null);
    const dest = pages.find((p) => p.id === saved.pageId);
    toast.success(`Moved “${saved.name}” to ${dest?.title ?? "another page"}`);
  }

  async function togglePageVisibility(target: PageDTO) {
    const visibility = target.visibility === "private" ? "public" : "private";
    try {
      const { page: saved } = await api<{ page: PageDTO }>(`/api/pages/${target.id}`, { method: "PATCH", json: { visibility } });
      setPages((ps) => ps.map((p) => (p.id === saved.id ? { ...p, visibility: saved.visibility } : p)));
      toast.success(visibility === "private" ? "Page is now private" : "Page is now public");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update visibility");
    }
  }

  async function toggleShelfVisibility(target: ShelfDTO) {
    const visibility = target.visibility === "private" ? "public" : "private";
    try {
      const { shelf: saved } = await api<{ shelf: ShelfDTO }>(`/api/shelves/${target.id}`, { method: "PATCH", json: { visibility } });
      patchShelf(saved.id, (s) => ({ ...s, visibility: saved.visibility }));
      toast.success(visibility === "private" ? "Collection is now private" : "Collection is now public");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update visibility");
    }
  }

  /* ---------- follow ---------- */
  async function toggleFollow() {
    if (!viewer) return router.push(`/login`);
    const prev = followState;
    const undo = prev !== "none";
    // Optimistic: predict the result from the profile's follow policy, then reconcile with the server.
    const predicted: typeof prev = undo ? "none" : profile.followPolicy === "open" ? "following" : "requested";
    const delta = (s: typeof prev) => (s === "following" ? 1 : 0);
    setFollowState(predicted);
    setStats((s) => ({ ...s, followers: s.followers - delta(prev) + delta(predicted) }));
    try {
      const { state } = await api<{ state: typeof prev }>(`/api/users/${user.username}/follow`, { method: undo ? "DELETE" : "POST" });
      if (state !== predicted) {
        setFollowState(state);
        setStats((s) => ({ ...s, followers: s.followers - delta(predicted) + delta(state) }));
      }
      if (!undo && state === "requested") toast.success(`Follow request sent to ${user.displayName}`);
    } catch (err) {
      setFollowState(prev);
      setStats((s) => ({ ...s, followers: s.followers - delta(predicted) + delta(prev) }));
      toast.error(err instanceof ApiError ? err.message : "Couldn't update follow");
    }
  }

  const shelfCount = page?.shelves.length ?? 0;
  const atLimit = shelfCount >= MAX_SHELVES_PER_PAGE;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      {/* ---------------------------------------------------------- header (Instagram layout) */}
      <div ref={header} data-testid="profile-header" className={clsx("profile-head py-5 sm:py-10 md:mx-auto md:max-w-3xl", !(user.bio || user.socialLinks?.length > 0) && "profile-head--bare")}>
        <span data-avatar className="inline-block justify-self-center [grid-area:avatar]">
          <Avatar name={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size={wide ? 160 : 84} className="shadow-xl ring-4 ring-surface" />
        </span>
        <div data-head className="min-w-0 [grid-area:name]">
          <h1 className="truncate text-body font-semibold tracking-tight sm:text-title">{user.displayName}</h1>
          <p className="truncate text-meta text-muted">@{user.username}</p>
        </div>
        <div data-head className="grid grid-cols-3 [grid-area:stats] sm:flex sm:gap-8" data-testid="profile-stats">
          <Stat value={stats.items} label={plural("item", stats.items)} onClick={() => content.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" })} />
          <Stat value={stats.followers} label={plural("follower", stats.followers)} onClick={() => setConnections("followers")} testId="followers-stat" />
          <Stat value={stats.following} label="following" onClick={() => setConnections("following")} testId="following-stat" />
        </div>
        {(user.bio || user.socialLinks?.length > 0) && (
          <div data-head className="min-w-0 space-y-3 [grid-area:about]">
            {user.bio && <p className="max-w-lg whitespace-pre-line text-meta text-foreground/85 sm:text-body">{user.bio}</p>}
            {user.socialLinks?.length > 0 && (
              <div className="-ml-1.5 flex flex-wrap gap-0.5">
                {user.socialLinks.map((l) => (
                  <a
                    key={l.network}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-hover"
                    aria-label={brandLabel(l.network)}
                  >
                    <span className="grid size-9 place-items-center rounded-full border border-border"><BrandIcon network={l.network} className="size-4" brand /></span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div data-head className="grid grid-cols-2 gap-2 [grid-area:actions] sm:flex">
          {isOwner ? (
            <Button variant="secondary" size="sm" className="sm:min-w-32" onClick={() => setProfileDialog(true)} data-testid="edit-profile">Edit profile</Button>
          ) : (
            <Button size="sm" variant={followState !== "none" ? "secondary" : "primary"} className="sm:min-w-32" onClick={toggleFollow} data-testid="follow-button">
              {following ? <><Check className="size-4" aria-hidden strokeWidth={2.4} /> Following</> : followState === "requested" ? <><Clock className="size-4" aria-hidden /> Requested</> : "Follow"}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="sm:min-w-32"
            data-testid="share-profile"
            onClick={async () => {
              const link = `${window.location.origin}/u/${user.username}`;
              try {
                if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title: `${user.displayName} on Museo`, url: link });
                else {
                  await navigator.clipboard.writeText(link);
                  toast.success("Profile link copied");
                }
              } catch (e) {
                if ((e as Error)?.name !== "AbortError") toast.info(link);
              }
            }}
          >
            <Share className="size-4" aria-hidden /> Share profile
          </Button>
        </div>
      </div>

      {showPostsTab && (
        <Tabs
          label="Profile sections"
          value={tab}
          onChange={setTab}
          className="-mx-4 sm:-mx-6"
          options={[
            { value: "collections", label: "Collections", icon: LayoutGrid },
            { value: "posts", label: (stats.posts ?? 0) > 0 ? `Posts ${stats.posts}` : "Posts", icon: NotebookPen },
          ]}
        />
      )}
      {/* ------------------------------------------ collections label + sticky page switcher */}
      {!showPostsTab && <div className="border-t border-border" />}
      {tab === "posts" ? (
        <ProfilePosts username={user.username} isOwner={isOwner} subscribed={subscribed} />
      ) : (
      <>
      <ProfileStickyBar headerRef={header} displayName={user.displayName} username={user.username} avatarUrl={user.avatarUrl}>
        {page && (isOwner || pages.length > 1) && (
          <PageSwitcher pages={pages} activeId={page.id} onSelect={selectPage} isOwner={isOwner} locked={locked} onCreate={startCreatePage} onReorder={isOwner ? persistPageOrder : undefined} />
        )}
      </ProfileStickyBar>

      {/* --------------------------------------------------------- body */}
      <div ref={content} className="mt-6" key={activeId}>
        {page ? (
          <div className="space-y-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-3 text-title font-semibold tracking-tight" data-testid="page-title">
                  {page.title}
                  {isOwner && page.visibility === "private" && <VisibilityLock label="Private page" />}
                </h2>
                {page.description && <p className="mt-1 max-w-2xl text-muted">{page.description}</p>}
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <span className="text-caption text-muted" data-testid="shelf-count">{shelfCount}/{MAX_SHELVES_PER_PAGE} {plural("collection", MAX_SHELVES_PER_PAGE)}</span>
                  <Menu
                    label="Page actions"
                    items={[
                      { label: "Edit page", onSelect: () => setPageDialog({ page }) },
                      { label: page.visibility === "private" ? "Make public" : "Make private", onSelect: () => void togglePageVisibility(page) },
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
                title={isOwner ? "Build your first collection" : "No collections yet"}
                description={isOwner ? "A collection holds one category — books, records, sneakers, bookmarks. Start with something you love." : "This page doesn’t have any collections yet."}
                action={isOwner ? <Button onClick={() => setShelfDialog({ shelf: null })}>Add a collection</Button> : undefined}
              />
            )}

            {page.shelves.map((shelf) => (
              <ShelfView
                key={shelf.id}
                shelf={shelf}
                username={user.username}
                isOwner={isOwner}
                justAddedId={justAdded}
                pagePrivate={page.visibility === "private"}
                canMoveUp={page.shelves[0]?.id !== shelf.id}
                canMoveDown={page.shelves[page.shelves.length - 1]?.id !== shelf.id}
                registerCapture={registerCapture}
                onOpenItem={openItemView}
                onAddItem={startAddItem}
                itemLimit={isOwner && !subscribed ? FREE_ITEMS_PER_SHELF : undefined}
                onEditShelf={(s) => setShelfDialog({ shelf: s })}
                onDeleteShelf={(s) => setConfirm({ kind: "shelf", id: s.id, name: s.name })}
                onReorder={onReorder}
                onMoveShelf={moveShelf}
                onToggleVisibility={toggleShelfVisibility}
                onMoveToPage={subscribed ? setMoveTarget : undefined}
                canMoveToPage={pages.length > 1}
              />
            ))}

            {isOwner && page.shelves.length > 0 && (
              <button
                onClick={() => (atLimit ? toast.info(`A page holds at most ${MAX_SHELVES_PER_PAGE} collections. Delete one or start a new page.`) : setShelfDialog({ shelf: null }))}
                data-testid="add-shelf"
                aria-disabled={atLimit}
                className={clsx(
                  "flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed py-8 text-meta font-medium transition",
                  atLimit ? "cursor-not-allowed border-border text-muted" : "border-border text-muted hover:border-accent hover:bg-accent-subtle/40 hover:text-foreground",
                )}
              >
                {atLimit ? `Collection limit reached (${MAX_SHELVES_PER_PAGE}/${MAX_SHELVES_PER_PAGE})` : <><Plus className="size-4" aria-hidden /> Add a collection <span className="text-caption">({shelfCount}/{MAX_SHELVES_PER_PAGE})</span></>}
              </button>
            )}
          </div>
        ) : null}
      </div>
      </>
      )}

      {/* ------------------------------------------------------ dialogs */}
      {isOwner && (
        <>
          <PageDialog open={Boolean(pageDialog)} page={pageDialog?.page ?? null} onClose={() => setPageDialog(null)} onSaved={onPageSaved} onPaywall={() => setPaywall("pages")} />
          {page && <ShelfDialog open={Boolean(shelfDialog)} pageId={page.id} shelf={shelfDialog?.shelf ?? null} onClose={() => setShelfDialog(null)} onSaved={onShelfSaved} />}
          <MoveShelfDialog shelf={moveTarget} pages={pages} onClose={() => setMoveTarget(null)} onMoved={onShelfMoved} />
          <AddItemDialog open={Boolean(addTo)} shelf={addTo} onClose={() => setAddTo(null)} onAdded={onItemAdded} onLimit={() => { setAddTo(null); setPaywall("items"); }} />
          <ConfirmDialog
            open={Boolean(confirm)}
            title={confirm?.kind === "page" ? "Delete this page?" : "Delete this collection?"}
            body={`“${confirm?.name ?? ""}” and everything on it will be permanently removed.`}
            confirmLabel="Delete"
            onClose={() => setConfirm(null)}
            onConfirm={doDelete}
          />
          {viewer && (
            <ProfileDialog
              open={profileDialog}
              viewer={{ ...viewer, displayName: user.displayName, bio: user.bio, avatarUrl: user.avatarUrl, socialLinks: user.socialLinks }}
              onClose={() => setProfileDialog(false)}
              onAvatar={(u) => {
                setUser((x) => ({ ...x, avatarUrl: u.avatarUrl }));
                toast.success(u.avatarUrl ? "Profile photo updated" : "Profile photo removed");
                router.refresh();
              }}
              onSaved={(u) => {
                setUser((x) => ({ ...x, displayName: u.displayName, bio: u.bio, socialLinks: u.socialLinks }));
                setProfileDialog(false);
                toast.success("Profile updated");
                router.refresh();
              }}
            />
          )}
          <PaywallDialog
            open={Boolean(paywall)}
            reason={paywall || "pages"}
            stripeEnabled={stripeEnabled}
            priceLabel={priceLabel}
            onClose={() => setPaywall(false)}
            onUpgraded={() => {
              const reason = paywall;
              setSubscribed(true);
              setPaywall(false);
              router.refresh();
              if (reason === "pages") setTimeout(() => setPageDialog({ page: null }), 350);
            }}
          />
        </>
      )}
      <FollowListDialog
        open={Boolean(connections)}
        username={user.username}
        initialKind={connections ?? "followers"}
        counts={{ followers: stats.followers, following: stats.following }}
        signedIn={Boolean(viewer)}
        onClose={() => setConnections(null)}
        onViewerFollowChange={isOwner ? (d) => setStats((s) => ({ ...s, following: Math.max(0, s.following + d) })) : undefined}
      />
      <ItemModal
        item={openItem}
        shelf={openShelf}
        isOwner={isOwner}
        viewerId={viewer?.id}
        onClose={() => setOpenItemId(null)}
        onUpdated={onItemUpdated}
        onDeleted={onItemDeleted}
        onNavigate={(it) => setOpenItemId(it.id)}
      />
    </div>
  );
}

function Stat({ value, label, onClick, testId }: { value: number; label: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      data-stat
      data-testid={testId}
      onClick={onClick}
      className="flex min-h-11 flex-col items-center justify-center rounded-xl leading-tight transition-opacity hover:opacity-70 active:opacity-60 sm:flex-row sm:items-baseline sm:gap-1.5"
    >
      <strong className="text-body font-semibold tabular-nums">{value.toLocaleString("en-US")}</strong>
      <span className="text-caption text-muted sm:text-meta">{label}</span>
    </button>
  );
}
