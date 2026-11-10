import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { uploadDir } from "@/lib/env";
import { UPLOAD_NAME_RE } from "@/lib/uploads";

const TYPES: Record<string, string> = { webp: "image/webp", gif: "image/gif", ico: "image/x-icon" };

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!UPLOAD_NAME_RE.test(name)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(uploadDir(), name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": TYPES[name.split(".")[1]],
        "cache-control": "public, max-age=31536000, immutable",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
