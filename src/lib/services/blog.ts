import { db } from "../db";
import { AppError } from "../errors";
import { firstImageSrc, htmlToText, sanitizeHtml } from "../html";
import { publicUserPreviewSelect, toPublicUser } from "../mappers";
import { canViewItem, itemVisibleWhere } from "../visibility";
import { saveUploadedImage } from "../uploads";
import type { BlogPostDTO, BlogPostSummaryDTO, BlogStatus, TaggedItemDTO } from "../dto";
import type { blogPostSchema, blogPostUpdateSchema } from "../validation";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

export const BLOG_PAGE_SIZE = 12;
const EXCERPT_LEN = 220;

const authorSelect = { select: publicUserPreviewSelect } as const;
const itemSelect = {
  id: true,
  title: true,
  imageUrl: true,
  faviconUrl: true,
  siteName: true,
  userId: true,
  visibility: true,
  user: { select: { username: true } },
  shelf: { select: { name: true, visibility: true, page: { select: { visibility: true } } } },
} as const;

async function assertPlus(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { subscribed: true } });
  if (!u?.subscribed) throw new AppError("PAYWALL", "The blog is a Museo Plus feature.");
}

/** Items may be tagged when the author can see them (their own, or anyone's public items). */
async function validItemIds(authorId: string, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await db.item.findMany({ where: { id: { in: unique } }, select: itemSelect });
  const ok = new Set(rows.filter((r) => canViewItem(r, authorId)).map((r) => r.id));
  const missing = unique.filter((id) => !ok.has(id));
  if (missing.length) throw new AppError("BAD_REQUEST", "One of the tagged items is no longer available");
  return unique;
}

function derive(contentHtml: string) {
  const clean = sanitizeHtml(contentHtml);
  const text = htmlToText(clean);
  return { contentHtml: clean, excerpt: text.length > EXCERPT_LEN ? text.slice(0, EXCERPT_LEN - 1).trimEnd() + "\u2026" : text, image: firstImageSrc(clean) };
}

async function coverFor(image: string | null, itemIds: string[]): Promise<string | null> {
  if (image) return image;
  if (!itemIds.length) return null;
  const first = await db.item.findUnique({ where: { id: itemIds[0] }, select: { imageUrl: true } });
  return first?.imageUrl ?? null;
}

export async function createPost(userId: string, input: z.infer<typeof blogPostSchema>) {
  await assertPlus(userId);
  const itemIds = await validItemIds(userId, input.itemIds);
  const d = derive(input.contentHtml);
  if (input.status === "published" && !d.excerpt && !d.image) throw new AppError("BAD_REQUEST", "Write something before publishing");
  const post = await db.blogPost.create({
    data: {
      userId,
      title: input.title,
      contentHtml: d.contentHtml,
      excerpt: d.excerpt,
      coverUrl: await coverFor(d.image, itemIds),
      status: input.status,
      publishedAt: input.status === "published" ? new Date() : null,
      items: { create: itemIds.map((itemId, position) => ({ itemId, position })) },
    },
  });
  return post;
}

async function ownPost(userId: string, id: string) {
  const post = await db.blogPost.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" }, select: { itemId: true } } } });
  if (!post) throw new AppError("NOT_FOUND", "That post is gone.");
  if (post.userId !== userId) throw new AppError("FORBIDDEN", "That post belongs to someone else");
  return post;
}

export async function updatePost(userId: string, id: string, input: z.infer<typeof blogPostUpdateSchema>) {
  await assertPlus(userId);
  const post = await ownPost(userId, id);
  const itemIds = input.itemIds ? await validItemIds(userId, input.itemIds) : post.items.map((i) => i.itemId);
  const d = derive(input.contentHtml ?? post.contentHtml);
  const status = input.status ?? (post.status as BlogStatus);
  if (status === "published" && !d.excerpt && !d.image) throw new AppError("BAD_REQUEST", "Write something before publishing");
  const data: Prisma.BlogPostUpdateInput = {
    title: input.title ?? post.title,
    contentHtml: d.contentHtml,
    excerpt: d.excerpt,
    coverUrl: await coverFor(d.image, itemIds),
    status,
    // First publish stamps the date; unpublishing keeps it so a re-publish doesn't jump the feed.
    publishedAt: status === "published" ? (post.publishedAt ?? new Date()) : post.publishedAt,
  };
  return db.$transaction(async (tx) => {
    if (input.itemIds) {
      await tx.blogPostItem.deleteMany({ where: { postId: id } });
      if (itemIds.length) await tx.blogPostItem.createMany({ data: itemIds.map((itemId, position) => ({ postId: id, itemId, position })) });
    }
    return tx.blogPost.update({ where: { id }, data });
  });
}

/** Delete is always allowed (even after Plus lapses). */
export async function deletePost(userId: string, id: string) {
  await ownPost(userId, id);
  await db.blogPost.delete({ where: { id } });
}

type PostRow = Prisma.BlogPostGetPayload<{ include: { user: typeof authorSelect; _count: { select: { items: true } } } }>;

function toSummary(p: PostRow): BlogPostSummaryDTO {
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    coverUrl: p.coverUrl,
    status: p.status === "published" ? "published" : "draft",
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    author: toPublicUser(p.user),
    itemCount: p._count.items,
  };
}

/** A post: published ones are public; drafts only for their author. */
export async function getPost(id: string, viewerId?: string | null): Promise<BlogPostDTO> {
  const p = await db.blogPost.findUnique({
    where: { id },
    include: { user: authorSelect, _count: { select: { items: true } }, items: { orderBy: { position: "asc" }, include: { item: { select: itemSelect } } } },
  });
  if (!p || (p.status !== "published" && p.userId !== viewerId)) throw new AppError("NOT_FOUND", "That post is gone.");
  const items: TaggedItemDTO[] = p.items
    .map((t) => t.item)
    .filter((it) => canViewItem(it, viewerId))
    .map((it) => ({ id: it.id, title: it.title, imageUrl: it.imageUrl, faviconUrl: it.faviconUrl, siteName: it.siteName, collection: it.shelf.name, username: it.user.username }));
  return { ...toSummary(p), contentHtml: sanitizeHtml(p.contentHtml), items, itemCount: items.length };
}

/** Raw tagged item ids for the editor (author only). */
export async function getPostForEdit(userId: string, id: string) {
  const post = await getPost(id, userId);
  if (post.author.id !== userId) throw new AppError("FORBIDDEN", "That post belongs to someone else");
  return post;
}

/**
 * Feed of posts, newest first. `author` filters to one writer; `mine` (signed in) includes drafts.
 * Cursor is the last post id (stable with the [publishedAt|updatedAt, id] ordering).
 */
export async function listPosts(opts: { author?: string; mine?: boolean; viewerId?: string | null; cursor?: string | null; limit?: number }) {
  const take = Math.min(opts.limit ?? BLOG_PAGE_SIZE, 50);
  let where: Prisma.BlogPostWhereInput = { status: "published" };
  let orderBy: Prisma.BlogPostOrderByWithRelationInput[] = [{ publishedAt: "desc" }, { id: "desc" }];
  if (opts.mine) {
    if (!opts.viewerId) throw new AppError("UNAUTHORIZED", "Please sign in to continue");
    where = { userId: opts.viewerId };
    orderBy = [{ updatedAt: "desc" }, { id: "desc" }];
  } else if (opts.author) {
    where = { status: "published", user: { username: opts.author.toLowerCase() } };
  }
  const rows = await db.blogPost.findMany({
    where,
    orderBy,
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: { user: authorSelect, _count: { select: { items: true } } },
  });
  const more = rows.length > take;
  const page = more ? rows.slice(0, take) : rows;
  return { posts: page.map(toSummary), nextCursor: more ? page[page.length - 1].id : null };
}

/** Published posts that tag an item (shown on the item's page). */
export async function postsForItem(itemId: string, viewerId?: string | null, limit = 6): Promise<BlogPostSummaryDTO[]> {
  const item = await db.item.findUnique({ where: { id: itemId }, select: itemSelect });
  if (!item || !canViewItem(item, viewerId)) throw new AppError("NOT_FOUND", "That item is gone.");
  const rows = await db.blogPost.findMany({
    where: { status: "published", items: { some: { itemId } } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
    include: { user: authorSelect, _count: { select: { items: true } } },
  });
  return rows.map(toSummary);
}

export function publishedCount(userId: string) {
  return db.blogPost.count({ where: { userId, status: "published" } });
}

/** Items the author can tag: their own (default) or any visible item on Museo. */
export async function searchTaggableItems(userId: string, q: string, scope: "mine" | "all") {
  const term = q.trim().slice(0, 80);
  const where: Prisma.ItemWhereInput = {
    AND: [
      scope === "mine" ? { userId } : itemVisibleWhere(userId),
      term ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { tags: { has: term.toLowerCase() } }] } : {},
    ],
  };
  const rows = await db.item.findMany({ where, orderBy: { createdAt: "desc" }, take: 24, select: itemSelect });
  return rows.map((it) => ({ id: it.id, title: it.title, imageUrl: it.imageUrl, faviconUrl: it.faviconUrl, siteName: it.siteName, collection: it.shelf.name, username: it.user.username }));
}

export async function tagItemsByIds(userId: string, ids: string[]): Promise<TaggedItemDTO[]> {
  if (!ids.length) return [];
  const rows = await db.item.findMany({ where: { id: { in: ids } }, select: itemSelect });
  const byId = new Map(rows.filter((r) => canViewItem(r, userId)).map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const it = byId.get(id);
    return it ? [{ id: it.id, title: it.title, imageUrl: it.imageUrl, faviconUrl: it.faviconUrl, siteName: it.siteName, collection: it.shelf.name, username: it.user.username }] : [];
  });
}

export async function uploadBlogImage(userId: string, buf: Buffer) {
  await assertPlus(userId);
  return saveUploadedImage(buf);
}
