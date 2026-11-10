/* Mobile + add-flow checks (375x812, 390x844 and desktop). BASE_URL (default localhost:3000). SHOT_PREFIX names screenshots.
   Set LINK to the product url to paste; defaults to an IKEA product page. */
import { chromium, devices, type Page } from "playwright";
import sharp from "sharp";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PREFIX = process.env.SHOT_PREFIX || "";
const LINK = process.env.LINK || "https://www.ikea.com/gb/en/p/billy-bookcase-white-00263850/";
const OUT = path.resolve("screenshots");
let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

const overflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function run(label: string, vp: { width: number; height: number } | null) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(
    vp ? { ...devices["iPhone 13"], viewport: vp, screen: vp } : { viewport: { width: 1280, height: 860 } },
  );
  const p = await ctx.newPage();
  const shot = (name: string) => p.screenshot({ path: path.join(OUT, `${PREFIX}${label}-${name}.png`) });
  const id = Math.random().toString(36).slice(2, 8);
  const tag = (s: string) => `${label}: ${s}`;

  await p.goto(`${BASE}/`);
  await p.waitForTimeout(1200);
  check(tag("landing has no horizontal scroll"), (await overflow(p)) <= 1, `${await overflow(p)}px`);
  await shot("landing");

  await p.goto(`${BASE}/signup`);
  await p.fill("#displayName", "Mobile Tester");
  await p.fill("#email", `mob_${label}_${id}@test.dev`);
  await p.fill("#username", `mob_${label}_${id}`);
  await p.fill("#password", "password123");
  await p.click("button[type=submit]");
  await p.waitForURL(new RegExp(`/u/mob_`));
  await p.waitForTimeout(1500);
  check(tag("profile has no horizontal scroll"), (await overflow(p)) <= 1, `${await overflow(p)}px`);
  check(tag("page switcher visible"), await p.getByTestId("page-switcher").isVisible());
  await shot("profile-empty");

  // category picker sheet
  await p.getByRole("button", { name: "Add a shelf" }).first().click();
  await p.fill("#shelf-name", "Fragrance");
  await p.click("#shelf-cat");
  const popup = p.getByTestId("category-popup");
  await popup.waitFor();
  await p.waitForTimeout(500);
  const pb = await popup.boundingBox();
  const vh = p.viewportSize()!.height;
  check(tag("category picker fits the viewport"), !!pb && pb.y >= 0 && pb.y + pb.height <= vh + 1, JSON.stringify(pb));
  await shot("category-picker");
  await p.keyboard.type("fra");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Create shelf" }).click();
  await p.getByRole("region", { name: "Fragrance" }).waitFor();

  // add-item sheet: paste a link
  await p.getByRole("button", { name: /Add (item to Fragrance|the first item)/ }).first().click();
  const form = p.getByTestId("add-item-form");
  await form.waitFor();
  await p.fill("#item-url", "");
  await p.locator("#item-url").pressSequentially(LINK.slice(0, 18), { delay: 5 });
  await p.evaluate((v) => {
    const el = document.querySelector<HTMLInputElement>("#item-url")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    el.dispatchEvent(new Event("paste", { bubbles: true }));
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, LINK);
  const sawSkeleton = await p.getByTestId("preview-skeleton").waitFor({ timeout: 4000 }).then(() => true, () => false);
  check(tag("skeleton shows while the preview loads"), sawSkeleton);
  await shot("add-skeleton");
  await p.getByTestId("link-preview").waitFor({ timeout: 40_000 });
  await p.waitForTimeout(800);
  const title = await p.inputValue("#item-title");
  check(tag("title auto-filled from the page"), title.length > 3, JSON.stringify(title.slice(0, 40)));
  const nCand = await p.getByTestId("photo-candidate").count();
  check(tag("candidate thumbnails offered inline"), nCand >= 1, `${nCand}`);
  const imgOk = await p.getByTestId("link-preview-image").evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 100);
  check(tag("preview card shows the detected photo"), imgOk);
  check(tag("no horizontal scroll with the add sheet open"), (await overflow(p)) <= 1);
  const dlg = await p.getByRole("dialog").boundingBox();
  check(tag("add sheet fits inside the viewport"), !!dlg && dlg.y >= -1 && dlg.y + dlg.height <= vh + 1 && dlg.x >= -1 && dlg.x + dlg.width <= p.viewportSize()!.width + 1, JSON.stringify(dlg));
  const hasCamera = await p.getByTestId("camera-button").isVisible();
  check(tag(vp ? "camera capture button visible on phones" : "camera button hidden on desktop"), vp ? hasCamera : !hasCamera);
  await shot("add-preview");
  if (nCand > 1) {
    await p.getByTestId("photo-candidate").nth(1).click();
    await p.waitForTimeout(300);
    check(tag("picking another candidate marks it selected"), (await p.getByTestId("photo-candidate").nth(1).getAttribute("aria-pressed")) === "true");
    await shot("add-picked-candidate");
  }
  // own photo
  const png = await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 200, g: 60, b: 90 } } }).png().toBuffer();
  await p.getByTestId("own-photo-input").setInputFiles({ name: "mine.png", mimeType: "image/png", buffer: png });
  await p.getByTestId("own-photo-tile").waitFor();
  check(tag("own photo tile shown + revert offered"), await p.getByTestId("revert-photo").isVisible());
  await shot("add-own-photo");
  await p.getByTestId("revert-photo").click();
  check(tag("revert returns to the link photo"), (await p.getByTestId("own-photo-tile").count()) === 0);
  await p.getByTestId("add-item-submit").scrollIntoViewIfNeeded();
  await p.getByTestId("add-item-submit").click();
  await p.getByTestId("add-item-form").waitFor({ state: "detached", timeout: 60_000 });
  await p.waitForTimeout(800);
  check(tag("item grid has no horizontal scroll"), (await overflow(p)) <= 1);
  await shot("item-grid");

  // item modal + photo editor
  await p.locator("[data-shelf-id] button, [data-shelf-id] a").filter({ hasText: /./ }).first().waitFor();
  await p.getByRole("button", { name: new RegExp(title.slice(0, 12).replace(/[^\w ]/g, ".")) }).first().click();
  await p.getByTestId("change-photo").click();
  await p.getByTestId("photo-editor").waitFor();
  await p.waitForTimeout(600);
  await p.getByTestId("photo-editor").locator('[data-testid="photo-candidate"]').first().waitFor({ timeout: 40_000 }).catch(() => {});
  await shot("item-photo-editor");
  await p.getByTestId("own-photo-input").setInputFiles({ name: "mine.png", mimeType: "image/png", buffer: png });
  await p.getByTestId("apply-photo").click();
  await p.getByTestId("photo-editor").waitFor({ state: "detached", timeout: 30_000 });
  check(tag("owner can replace the item photo with their own"), true);
  await p.getByTestId("change-photo").click();
  await p.getByTestId("refresh-photo").click();
  await p.getByTestId("photo-editor").waitFor({ state: "detached", timeout: 60_000 });
  check(tag("owner can refresh the photo from the link"), true);
  await shot("item-modal");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(700);

  // profile edit + avatar
  await p.getByRole("button", { name: "Edit profile" }).click();
  const av = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
  await p.getByTestId("avatar-input").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: av });
  await p.waitForTimeout(2000);
  await shot("profile-edit");
  check(tag("profile edit dialog has no horizontal scroll"), (await overflow(p)) <= 1);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);

  // navbar / account menu
  await p.getByRole("button", { name: "Account menu" }).click();
  await p.waitForTimeout(300);
  await shot("account-menu");
  await p.keyboard.press("Escape");
  await browser.close();
}

async function main() {
  const only = process.env.ONLY;
  const sets: Array<[string, { width: number; height: number } | null]> = [
    ["m375", { width: 375, height: 812 }],
    ["m390", { width: 390, height: 844 }],
    ["desktop", null],
  ];
  for (const [label, vp] of sets) if (!only || only === label) await run(label, vp);
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
