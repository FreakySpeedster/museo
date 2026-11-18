import { route, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { usernameSchema } from "@/lib/validation";

/** Live availability for the signup form. Always 200 so the field can show the reason inline. */
export const GET = route(
  async ({ req }) => {
    const parsed = usernameSchema.safeParse(req.nextUrl.searchParams.get("u") ?? "");
    if (!parsed.success) return ok({ available: false, reason: parsed.error.issues[0]?.message ?? "Not a valid username" });
    const taken = await db.user.findUnique({ where: { username: parsed.data }, select: { id: true } });
    return ok({ available: !taken, reason: taken ? "That username is taken" : null });
  },
  { limit: { key: "username-check", max: 60, windowMs: 60_000 } },
);
