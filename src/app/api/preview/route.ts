import { route, ok } from "@/lib/api";
import { resolveLinkPreview } from "@/lib/link-preview";
import { previewQuerySchema } from "@/lib/validation";

export const maxDuration = 45;

/** Live preview for the add-item form: title, description, best verified photo and alternatives to pick from. */
export const GET = route(
  async ({ req }) => {
    const { url } = previewQuerySchema.parse({ url: new URL(req.url).searchParams.get("url") ?? "" });
    const { preview: p, best, alternatives } = await resolveLinkPreview(url, { alternatives: 5 });
    const candidates = [best, ...alternatives].filter(Boolean).map((c) => ({ url: c!.url, width: c!.width, height: c!.height, source: c!.source, thumb: c!.thumb }));
    return ok({
      preview: { url: p.url, title: p.title, description: p.description, siteName: p.siteName, image: best?.url ?? p.image, favicon: p.favicon, candidates },
    });
  },
  { auth: true, limit: { key: "preview", max: 40, windowMs: 60_000 } },
);
