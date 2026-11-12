import { db } from "../db";
import type { SearchHit, SearchSort, SearchType } from "../dto";

export const SEARCH_PAGE_SIZE = 20;

const like = (q: string) => `%${q.replace(/[%_\\]/g, "\\$&")}%`;
const visItem = `AND ((i.visibility = 'public' AND s.visibility = 'public' AND p.visibility = 'public') OR i."userId" = $5)`;
const visShelf = `AND ((s.visibility = 'public' AND p.visibility = 'public') OR p."userId" = $5)`;

type PersonRow = { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date; score: number; followers: bigint };
type ItemRow = { id: string; title: string; description: string; imageUrl: string | null; createdAt: Date; score: number; likes: bigint; username: string; shelfName: string };
type ShelfRow = { id: string; name: string; category: string; createdAt: Date; score: number; likes: bigint; username: string; pageId: string };

async function people(q: string, sort: SearchSort, take: number, offset: number): Promise<SearchHit[]> {
  const pattern = like(q);
  const order =
    sort === "new" ? 'u."createdAt" DESC' : sort === "top" ? "followers DESC, score DESC" : "score DESC, followers DESC";
  const rows = await db.$queryRawUnsafe<PersonRow[]>(
    `
    SELECT u.id, u.username, u."displayName", u."avatarUrl", u."createdAt",
      GREATEST(similarity(u.username, $1), similarity(u."displayName", $1)) AS score,
      (SELECT COUNT(*) FROM "Follow" f WHERE f."followingId" = u.id) AS followers
    FROM "User" u
    WHERE u.username ILIKE $2 ESCAPE '\\' OR u."displayName" ILIKE $2 ESCAPE '\\'
    ORDER BY ${order}
    LIMIT $3 OFFSET $4
    `,
    q,
    pattern,
    take,
    offset,
  );
  return rows.map((r) => ({
    kind: "person" as const,
    id: r.id,
    title: r.displayName,
    subtitle: `@${r.username}`,
    href: `/u/${r.username}`,
    imageUrl: r.avatarUrl,
    createdAt: r.createdAt.toISOString(),
    score: Number(r.score),
  }));
}

async function items(q: string, sort: SearchSort, take: number, offset: number, viewerId?: string | null): Promise<SearchHit[]> {
  const pattern = like(q);
  const order = sort === "new" ? 'i."createdAt" DESC' : sort === "top" ? "likes DESC, score DESC" : "score DESC, likes DESC";
  const rows = await db.$queryRawUnsafe<ItemRow[]>(
    `
    SELECT i.id, i.title, i.description, i."imageUrl", i."createdAt",
      GREATEST(similarity(i.title, $1), similarity(i.description, $1)) AS score,
      (SELECT COUNT(*) FROM "ItemLike" l WHERE l."itemId" = i.id) AS likes,
      u.username, s.name AS "shelfName"
    FROM "Item" i
    JOIN "User" u ON u.id = i."userId"
    JOIN "Shelf" s ON s.id = i."shelfId"
    JOIN "Page" p ON p.id = s."pageId"
    WHERE (i.title ILIKE $2 ESCAPE '\\' OR i.description ILIKE $2 ESCAPE '\\')
      ${visItem}
    ORDER BY ${order}
    LIMIT $3 OFFSET $4
    `,
    q,
    pattern,
    take,
    offset,
    viewerId ?? "",
  );
  return rows.map((r) => ({
    kind: "item" as const,
    id: r.id,
    title: r.title,
    subtitle: `${r.shelfName} · @${r.username}`,
    href: `/i/${r.id}`,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
    score: Number(r.score),
  }));
}

async function shelves(q: string, sort: SearchSort, take: number, offset: number, viewerId?: string | null): Promise<SearchHit[]> {
  const pattern = like(q);
  const order = sort === "new" ? 's."createdAt" DESC' : sort === "top" ? "likes DESC, score DESC" : "score DESC, likes DESC";
  const rows = await db.$queryRawUnsafe<ShelfRow[]>(
    `
    SELECT s.id, s.name, s.category, s."createdAt",
      similarity(s.name, $1) AS score,
      (SELECT COUNT(*) FROM "ItemLike" l JOIN "Item" i ON i.id = l."itemId" WHERE i."shelfId" = s.id) AS likes,
      u.username, p.id AS "pageId"
    FROM "Shelf" s
    JOIN "Page" p ON p.id = s."pageId"
    JOIN "User" u ON u.id = p."userId"
    WHERE s.name ILIKE $2 ESCAPE '\\'
      ${visShelf}
    ORDER BY ${order}
    LIMIT $3 OFFSET $4
    `,
    q,
    pattern,
    take,
    offset,
    viewerId ?? "",
  );
  return rows.map((r) => ({
    kind: "shelf" as const,
    id: r.id,
    title: r.name,
    subtitle: `${r.category} · @${r.username}`,
    href: `/u/${r.username}?page=${r.pageId}`,
    imageUrl: null,
    createdAt: r.createdAt.toISOString(),
    score: Number(r.score),
  }));
}

export async function searchPreview(q: string, limit = 5, viewerId?: string | null): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const take = limit;
  const [p, i, s] = await Promise.all([
    people(query, "relevance", take, 0),
    items(query, "relevance", take, 0, viewerId),
    shelves(query, "relevance", take, 0, viewerId),
  ]);
  return [...p, ...i, ...s].sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function searchPage(q: string, type: SearchType, sort: SearchSort, cursor?: string, viewerId?: string | null) {
  const query = q.trim();
  if (!query) return { items: [] as SearchHit[], nextCursor: null as string | null };
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const take = SEARCH_PAGE_SIZE + 1;
  let hits: SearchHit[] = [];
  if (type === "people") hits = await people(query, sort, take, offset);
  else if (type === "items") hits = await items(query, sort, take, offset, viewerId);
  else if (type === "shelves") hits = await shelves(query, sort, take, offset, viewerId);
  else {
    const [p, i, s] = await Promise.all([
      people(query, sort, take, offset),
      items(query, sort, take, offset, viewerId),
      shelves(query, sort, take, offset, viewerId),
    ]);
    hits = [...p, ...i, ...s].sort((a, b) => (sort === "new" ? b.createdAt.localeCompare(a.createdAt) : b.score - a.score || b.createdAt.localeCompare(a.createdAt)));
    hits = hits.slice(0, take);
  }
  const hasMore = hits.length > SEARCH_PAGE_SIZE;
  const slice = hits.slice(0, SEARCH_PAGE_SIZE);
  return { items: slice, nextCursor: hasMore ? String(offset + slice.length) : null };
}
