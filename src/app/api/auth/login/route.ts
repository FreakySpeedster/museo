import { route, readJson, ok } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { authenticate } from "@/lib/services/accounts";
import { loginSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";

export const POST = route(
  async ({ req }) => {
    const input = loginSchema.parse(await readJson(req));
    const user = await authenticate(input);
    await createSession(user.id);
    return ok({ user: toViewerDTO(user) });
  },
  { limit: { key: "login", max: 15, windowMs: 10 * 60_000 } },
);
