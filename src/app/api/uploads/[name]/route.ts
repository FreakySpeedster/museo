import { NextResponse, type NextRequest } from "next/server";
import { storeRead } from "@/lib/storage";
import { UPLOAD_NAME_RE } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!UPLOAD_NAME_RE.test(name)) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await storeRead(name);
    if (!file) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "content-type": file.contentType,
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
