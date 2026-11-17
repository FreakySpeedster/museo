import { route, readJson, ok } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { resetPassword } from "@/lib/services/passwords";
import { resetPasswordSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";

export const POST = route(
  async ({ req }) => {
    const { token, password } = resetPasswordSchema.parse(await readJson(req));
    const user = await resetPassword(token, password); // revokes every existing session
    await createSession(user.id);
    return ok({ user: toViewerDTO(user) });
  },
  { limit: { key: "pw-reset-submit", max: 10, windowMs: 15 * 60_000 } },
);
