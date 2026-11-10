/* Run the extraction pipeline directly (no DB writes): npx tsx scripts/extract-cli.ts [url ...] */
import fs from "node:fs";
import { resolveLinkPreview } from "../src/lib/link-preview";

async function main() {
  const urls = process.argv.slice(2);
  const list = urls.length ? urls.map((url) => ({ name: url, url })) : (JSON.parse(fs.readFileSync("scripts/preview-testset.json", "utf8")) as Array<{ name: string; url: string }>);
  for (const t of list) {
    const t0 = Date.now();
    try {
      const r = await resolveLinkPreview(t.url, { fresh: true, alternatives: 4 });
      const b = r.best;
      console.log(`${t.name.slice(0, 30).padEnd(30)} ${String(Date.now() - t0).padStart(5)}ms via=${r.preview.fetchedAs} title=${JSON.stringify(r.preview.title.slice(0, 32))} best=${b ? `${b.width}x${b.height} ${b.source} ${b.url.slice(0, 90)}` : "NONE"} alts=${r.alternatives.length}`);
    } catch (e) {
      console.log(`${t.name.slice(0, 30).padEnd(30)} ERROR ${(e as Error).message}`);
    }
  }
}
main();
