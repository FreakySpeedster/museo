import { randomBytes } from "node:crypto";
import { route, clientIp } from "@/lib/api";
import { NextResponse } from "next/server";
import { recordItemView } from "@/lib/services/views";

const VISITOR_COOKIE = "nook_vid";

/** Count a view (called by the item view once it is on screen). Owner views and bots are ignored server-side. */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    const fresh = !user && !(visitorId && /^[a-f0-9]{32}$/.test(visitorId));
    if (fresh) visitorId = randomBytes(16).toString("hex");
    const ua = req.headers.get("user-agent");
    const result = await recordItemView(params.id, {
      userId: user?.id,
      visitorId: user ? null : visitorId,
      fallback: `${clientIp(req)}|${ua ?? ""}`,
      userAgent: ua,
    });
    const res = NextResponse.json(result);
    if (fresh && visitorId) {
      res.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  },
  { limit: { key: "item-view", max: 120, windowMs: 60_000 } },
);
