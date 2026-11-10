/* UI checks for the category picker + avatar upload. BASE_URL (default localhost:3000). SHOT_PREFIX names screenshots. */
import { chromium, type Page } from "playwright";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PREFIX = process.env.SHOT_PREFIX || "";
const OUT = path.resolve("screenshots");
let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};
const shot = (p: Page, name: string) => p.screenshot({ path: path.join(OUT, `${PREFIX}${name}.png`) });

async function main() {
  const id = Math.random().toString(36).slice(2, 8);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/signup`);
  await p.fill("#displayName", "Extras Tester");
  await p.fill("#email", `extras_${id}@test.dev`);
  await p.fill("#username", `extras_${id}`);
  await p.fill("#password", "password123");
  await p.click("button[type=submit]");
  await p.waitForURL(new RegExp(`/u/extras_${id}`));
  await p.waitForTimeout(1500);

  // ---- category picker
  await p.getByRole("button", { name: "Add a shelf" }).click();
  await p.fill("#shelf-name", "Fragrance");
  check("no native <select> in the shelf dialog", (await p.locator("select").count()) === 0);
  await p.click("#shelf-cat");
  const popup = p.getByTestId("category-popup");
  await popup.waitFor();
  await p.waitForTimeout(500);
  check("picker shows grouped sections", (await popup.getByText("Fashion & Accessories").count()) > 0 && (await popup.getByText("Hobbies & Collectibles").count()) > 0);
  check("picker lists many categories", (await popup.getByRole("option").count()) > 60);
  check("search box is focused", await p.getByRole("searchbox", { name: "Search categories" }).evaluate((el) => el === document.activeElement));
  await shot(p, "picker-open");
  await p.keyboard.type("fra");
  await p.waitForTimeout(150);
  check("typing filters the list", (await popup.getByRole("option").count()) < 6);
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("ArrowUp");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(250);
  check("Enter selects and closes (dialog stays open)", !(await popup.isVisible().catch(() => false)) && (await p.getByRole("dialog").isVisible()));
  check("trigger shows the chosen category", (await p.locator("#shelf-cat").textContent())?.includes("Fragrance") ?? false);
  await p.click("#shelf-cat");
  await popup.waitFor();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  check("Escape closes only the picker", !(await popup.isVisible().catch(() => false)) && (await p.getByRole("dialog").isVisible()));
  await p.getByRole("button", { name: "Create shelf" }).click();
  await p.getByRole("region", { name: "Fragrance" }).waitFor();
  check("shelf created with the Fragrance category", (await p.getByText("Fragrance · 0 items").count()) === 1);

  // custom category
  await p.getByTestId("add-shelf").click();
  await p.fill("#shelf-name", "My teapots");
  await p.click("#shelf-cat");
  await popup.waitFor();
  await p.keyboard.type("Yixing teapots");
  check("offers to use a custom category", (await popup.getByText("Use “Yixing teapots”").count()) === 1);
  await p.keyboard.press("Enter");
  await p.getByRole("button", { name: "Create shelf" }).click();
  await p.getByRole("region", { name: "My teapots" }).waitFor();
  check("custom category label is shown on the shelf", (await p.getByText("Yixing teapots · 0 items").count()) === 1);

  // mobile bottom sheet + dark mode
  await p.getByTestId("add-shelf").click();
  await p.setViewportSize({ width: 390, height: 780 });
  await p.click("#shelf-cat");
  await popup.waitFor();
  await p.waitForTimeout(500);
  const box = await popup.boundingBox();
  check("mobile: picker becomes a bottom sheet", !!box && box.width >= 380 && box.y + box.height >= 760);
  await shot(p, "picker-mobile");
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 1280, height: 860 });
  await p.evaluate(() => document.documentElement.classList.add("dark"));
  await p.waitForTimeout(300);
  await p.getByTestId("add-shelf").click();
  await p.click("#shelf-cat");
  await popup.waitFor();
  await p.waitForTimeout(500);
  await shot(p, "picker-dark");
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await p.evaluate(() => document.documentElement.classList.remove("dark"));

  // ---- avatar
  await p.getByRole("button", { name: "Edit profile" }).click();
  const png = await sharp({ create: { width: 800, height: 500, channels: 3, background: "#2a9d8f" } })
    .composite([{ input: Buffer.from(`<svg width="300" height="300"><circle cx="150" cy="150" r="140" fill="#e76f51"/></svg>`), gravity: "center" }])
    .png().toBuffer();
  const tmp = path.join(process.env.TMPDIR || "/tmp", `avatar-${id}.png`);
  fs.writeFileSync(tmp, png);
  await p.getByTestId("avatar-input").setInputFiles(tmp);
  await p.getByRole("button", { name: "Replace photo" }).waitFor({ timeout: 20000 });
  check("avatar uploaded from Edit profile", true);
  await p.getByRole("button", { name: "Save" }).click();
  await p.waitForTimeout(1500);
  const src = await p.locator("[data-avatar] img").getAttribute("src");
  check("profile header shows the uploaded avatar", !!src && /\/api\/uploads\/|blob\.vercel-storage\.com/.test(src), src ?? "");
  const nav = await p.locator("header img").first().getAttribute("src");
  check("navbar shows the uploaded avatar", nav === src);
  const res = await p.request.get(src!.startsWith("http") ? src! : BASE + src!);
  const meta = await sharp(await res.body()).metadata();
  check("avatar is a 512px square WebP", res.status() === 200 && meta.width === 512 && meta.height === 512 && meta.format === "webp", `${meta.width}x${meta.height} ${meta.format}`);
  await shot(p, "avatar-profile");
  await p.getByRole("button", { name: "Edit profile" }).click();
  await p.getByRole("button", { name: "Remove" }).click();
  await p.getByRole("button", { name: "Upload photo" }).waitFor();
  check("avatar can be removed", true);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  check("initial circle returns after removal", (await p.locator("[data-avatar] img").count()) === 0);

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll extras checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
