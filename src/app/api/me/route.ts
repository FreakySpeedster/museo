import { route, readJson, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";

export const GET = route(async ({ user }) => ok({ user: user ? toViewerDTO(user) : null }));

export const PATCH = route(
  async ({ req, user }) => {
    const input = profileSchema.parse(await readJson(req));
    const updated = await db.user.update({ where: { id: user.id }, data: input });
    return ok({ user: toViewerDTO(updated) });
  },
  { auth: true },
);
