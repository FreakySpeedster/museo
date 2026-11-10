import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Postgres-backed fixed-window rate limiter — one atomic upsert per check, so it is correct across
 * any number of serverless instances (no in-memory state).
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const windowSec = windowMs / 1000;
  const rows = await db.$queryRaw<Array<{ count: number; retry: number }>>(Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count",
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("windowStart" + make_interval(secs => ${windowSec}) - now()))))::int AS "retry"
  `);
  const { count, retry } = rows[0];
  // Opportunistic cleanup keeps the table small without needing a cron job.
  if (Math.random() < 0.01) {
    void db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 24 * 3600_000) } } }).catch(() => {});
  }
  return count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.max(1, retry) };
}
