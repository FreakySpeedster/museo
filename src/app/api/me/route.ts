import { route, readJson, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validation";
import { toViewerDTO } from "@/lib/mappers";
import { normalizeSocialLinks } from "@/lib/social-links";
import { AppError } from "@/lib/errors";
import { setFollowPolicy } from "@/lib/services/notifications";

export const GET = route(async ({ user }) => ok({ user: user ? toViewerDTO(user) : null }));

export const PATCH = route(
  async ({ req, user }) => {
    const input = profileSchema.parse(await readJson(req));
    const data: { displayName: string; bio: string; socialLinks?: ReturnType<typeof normalizeSocialLinks> } = {
      displayName: input.displayName,
      bio: input.bio,
    };
    if (input.socialLinks) {
      try {
        data.socialLinks = normalizeSocialLinks(input.socialLinks);
      } catch (e) {
        throw new AppError("BAD_REQUEST", e instanceof Error ? e.message : "Check your social links");
      }
    }
    if (input.followPolicy && input.followPolicy !== user.followPolicy) await setFollowPolicy(user.id, input.followPolicy);
    const updated = await db.user.update({ where: { id: user.id }, data });
    return ok({ user: toViewerDTO(updated) });
  },
  { auth: true },
);
