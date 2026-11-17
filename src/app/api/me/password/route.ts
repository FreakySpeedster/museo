import { route, readJson, ok } from "@/lib/api";
import { currentSessionHash } from "@/lib/auth";
import { changePassword } from "@/lib/services/passwords";
import { changePasswordSchema } from "@/lib/validation";

export const POST = route(
  async ({ req, user }) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(req));
    const result = await changePassword(user.id, currentPassword, newPassword, await currentSessionHash());
    return ok(result);
  },
  { auth: true, limit: { key: "pw-change", max: 10, windowMs: 15 * 60_000 } },
);
