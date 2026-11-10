import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { backfillThumbnails } from "@/lib/services/items";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Operator endpoint: fills in missing link thumbnails. Requires `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not allowed" } }, { status: 401 });
  return NextResponse.json(await backfillThumbnails(10));
}
