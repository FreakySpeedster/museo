import { route, ok } from "@/lib/api";
import { getLinkPreview } from "@/lib/link-preview";
import { previewQuerySchema } from "@/lib/validation";

export const GET = route(
  async ({ req }) => {
    const { url } = previewQuerySchema.parse({ url: new URL(req.url).searchParams.get("url") ?? "" });
    const p = await getLinkPreview(url);
    return ok({ preview: { url: p.url, title: p.title, description: p.description, siteName: p.siteName, image: p.image, favicon: p.favicon } });
  },
  { auth: true, limit: { key: "preview", max: 40, windowMs: 60_000 } },
);
