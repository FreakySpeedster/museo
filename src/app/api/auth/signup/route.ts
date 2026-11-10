import { route, readJson, ok } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { createUser } from "@/lib/services/accounts";
import { signupSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";

export const POST = route(
  async ({ req }) => {
    const input = signupSchema.parse(await readJson(req));
    const user = await createUser(input);
    await createSession(user.id);
    return ok({ user: toViewerDTO(user) }, 201);
  },
  { limit: { key: "signup", max: 20, windowMs: 60 * 60_000 } },
);
