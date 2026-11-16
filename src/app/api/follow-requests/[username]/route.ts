import { z } from "zod";
import { route, readJson, ok } from "@/lib/api";
import { respondToRequest } from "@/lib/services/notifications";

const schema = z.object({ accept: z.boolean() });

export const POST = route<{ username: string }>(
  async ({ req, user, params }) => {
    const { accept } = schema.parse(await readJson(req));
    await respondToRequest(user.id, params.username, accept);
    return ok({ accepted: accept });
  },
  { auth: true },
);
