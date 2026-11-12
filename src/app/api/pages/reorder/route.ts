import { route, readJson, ok } from "@/lib/api";
import { reorderPages } from "@/lib/services/pages";
import { reorderPagesSchema } from "@/lib/validation";

export const POST = route(
  async ({ req, user }) => {
    const { pageIds } = reorderPagesSchema.parse(await readJson(req));
    await reorderPages(user.id, pageIds);
    return ok({ ok: true });
  },
  { auth: true },
);
