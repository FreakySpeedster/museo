import { createHash } from "node:crypto";
import { db } from "../db";
import { AppError } from "../errors";
import { canViewItem } from "../visibility";

/** A viewer's repeat visits within this window count once. */
export const VIEW_DEDUPE_HOURS = 24;

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|httpclient|axios|node-fetch|go-http|java\/|headless|lighthouse|pingdom|uptime|monitor|scrapy/i;

export function isLikelyBot(ua?: string | null): boolean {
  return !ua || ua.length < 12 || BOT_UA.test(ua);
}

export function viewerKey(v: { userId?: string | null; visitorId?: string | null; fallback?: string | null }): string | null {
  const raw = v.userId ? `u:${v.userId}` : v.visitorId ? `a:${v.visitorId}` : v.fallback ? `f:${v.fallback}` : null;
  return raw ? createHash("sha256").update(raw).digest("hex").slice(0, 40) : null;
}

/**
 * Count a view of an item. The owner's own views never count; each viewer (signed-in user or
 * anonymous visitor cookie) counts once per 24h. Returns the current total.
 */
export async function recordItemView(
  itemId: string,
  viewer: { userId?: string | null; visitorId?: string | null; fallback?: string | null; userAgent?: string | null },
): Promise<{ counted: boolean; viewCount: number }> {
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: { id: true, userId: true, visibility: true, viewCount: true, shelf: { select: { visibility: true, page: { select: { visibility: true } } } } },
  });
  if (!item || !canViewItem(item, viewer.userId)) throw new AppError("NOT_FOUND", "That item is gone.");
  const key = viewerKey(viewer);
  if (viewer.userId === item.userId || !key || isLikelyBot(viewer.userAgent)) return { counted: false, viewCount: item.viewCount };
  // Insert a fresh view, or refresh one older than the window; skipped (0 rows) when seen recently.
  const affected = await db.$executeRaw`
    INSERT INTO "ItemView" ("itemId", "viewerKey", "lastViewedAt") VALUES (${itemId}, ${key}, now())
    ON CONFLICT ("itemId", "viewerKey") DO UPDATE SET "lastViewedAt" = now()
    WHERE "ItemView"."lastViewedAt" < now() - make_interval(hours => ${VIEW_DEDUPE_HOURS}::int)`;
  if (!affected) return { counted: false, viewCount: item.viewCount };
  const updated = await db.item.update({ where: { id: itemId }, data: { viewCount: { increment: 1 } }, select: { viewCount: true } });
  return { counted: true, viewCount: updated.viewCount };
}
