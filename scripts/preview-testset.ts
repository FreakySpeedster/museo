/* Runs the live (or local) /api/preview over scripts/preview-testset.json using a throwaway account.
   usage: BASE_URL=... npx tsx scripts/preview-testset.ts > out.json */
import fs from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const set: Array<{ name: string; url: string }> = JSON.parse(fs.readFileSync("scripts/preview-testset.json", "utf8"));
let cookie = "";
async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, { ...init, headers: { ...(init.headers ?? {}), cookie } });
  const sc = res.headers.getSetCookie?.() ?? [];
  if (sc.length) cookie = sc.map((c) => c.split(";")[0]).join("; ");
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function main() {
  const id = Math.random().toString(36).slice(2, 8);
  await call("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `pt_${id}@test.dev`, username: `pt_${id}`, password: "password123" }) });
  const out = [];
  for (const t of set) {
    const t0 = Date.now();
    const r = await call(`/api/preview?url=${encodeURIComponent(t.url)}`);
    out.push({ ...t, status: r.status, ms: Date.now() - t0, preview: r.body?.preview ? { ...r.body.preview, candidates: (r.body.preview.candidates ?? []).map((c: { thumb?: string }) => ({ ...c, thumb: undefined })) } : (r.body?.error ?? null) });
  }
  console.log(JSON.stringify(out, null, 1));
}
main();
