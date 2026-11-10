import { route, readJson, ok } from "@/lib/api";
import { createPage, listPages } from "@/lib/services/pages";
import { pageSchema } from "@/lib/validation";
import { toPageDTO } from "@/lib/mappers";

export const GET = route(
  async ({ user }) => ok({ pages: (await listPages(user.id)).map(toPageDTO) }),
  { auth: true },
);

export const POST = route(
  async ({ req, user }) => {
    const input = pageSchema.parse(await readJson(req));
    const page = await createPage(user.id, input);
    return ok({ page: toPageDTO(page) }, 201);
  },
  { auth: true },
);
