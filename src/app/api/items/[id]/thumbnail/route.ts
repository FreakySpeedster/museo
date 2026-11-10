import { route, ok } from "@/lib/api";
import { refreshItemThumbnail } from "@/lib/services/items";
import { toItemDTO } from "@/lib/mappers";

export const maxDuration = 30;

/** Owner-only: retry fetching the thumbnail for a link item that has none. */
export const POST = route<{ id: string }>(
  async ({ user, params }) => ok({ item: toItemDTO(await refreshItemThumbnail(params.id, { userId: user.id })) }),
  { auth: true, limit: { key: "thumb-refresh", max: 30, windowMs: 60_000 } },
);
