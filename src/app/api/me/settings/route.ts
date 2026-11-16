import { route, readJson, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";
import { setFollowPolicy } from "@/lib/services/notifications";

export const PATCH = route(
  async ({ req, user }) => {
    const input = settingsSchema.parse(await readJson(req));
    let approved = 0;
    if (input.followPolicy && input.followPolicy !== user.followPolicy) {
      approved = input.followPolicy === "open" ? await db.followRequest.count({ where: { targetId: user.id } }) : 0;
      await setFollowPolicy(user.id, input.followPolicy);
    }
    const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    return ok({ user: toViewerDTO(fresh), approved });
  },
  { auth: true },
);
