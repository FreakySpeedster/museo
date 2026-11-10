/* Drives the running app with headless Chromium: verifies the main UI flows and saves screenshots. */
import { chromium, type Page } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve("screenshots");
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

const settle = (p: Page, ms = 1800) => p.waitForTimeout(ms);
const shot = async (p: Page, name: string, fullPage = false) => {
  await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log(`shot  ${name}.png`);
};

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/u\//);
}

async function main() {
  const browser = await chromium.launch();
  const errors: string[] = [];
  const watch = (p: Page) => {
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  };

  /* ---------------------------------------------------------- landing */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(BASE);
  await settle(page, 2500);
  check("landing renders hero", (await page.textContent("h1"))?.includes("Show off what you collect") ?? false);
  await shot(page, "01-landing");
  await page.evaluate(() => window.scrollTo(0, 1100));
  await settle(page, 1200);
  await shot(page, "01b-landing-scrolled");

  /* ------------------------------------------- demo profile (read-only) */
  await login(page, "demo@shelfie.app", "demo1234");
  await settle(page, 2800);
  check("demo profile shows shelves", (await page.locator("[data-shelf-id]").count()) >= 4);
  await shot(page, "02-profile-shelves");
  await page.evaluate(() => window.scrollTo(0, 900));
  await settle(page, 1500);
  await shot(page, "02b-profile-shelves-scrolled");
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.click("[data-testid=tab-timeline]");
  await settle(page, 1500);
  await page.mouse.wheel(0, 500);
  await settle(page, 1500);
  check("timeline entries render", (await page.locator("[data-testid=timeline-entry]").count()) > 3);
  await shot(page, "03-timeline");
  await page.click("[data-testid=tab-shelves]");
  await settle(page, 1000);

  // Add-item dialog with a live link preview (nothing is submitted for the demo user)
  await page.getByRole("button", { name: /Add item to Currently reading/ }).click();
  await page.fill("#item-url", "https://github.com/greensock/GSAP");
  await page.waitForSelector("[data-testid=link-preview]", { timeout: 20000 });
  await settle(page, 700);
  check("add-item dialog shows fetched preview", await page.locator("[data-testid=link-preview] img").isVisible());
  await shot(page, "04-add-item-dialog");
  await page.keyboard.press("Escape");
  await settle(page, 500);

  // Paywall: demo user is on the free plan with one page
  await page.click("[data-testid=new-page]");
  await page.waitForSelector("[data-testid=paywall]");
  await settle(page, 800);
  check("paywall opens for 2nd page", true);
  await shot(page, "05-paywall");
  await page.keyboard.press("Escape");

  // Dark mode + mobile
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await settle(page, 600);
  await shot(page, "06-profile-dark");
  await ctx.close();

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  watch(mp);
  await mp.goto(`${BASE}/u/maya`);
  await settle(mp, 2800);
  await shot(mp, "07-mobile-profile");
  await mctx.close();

  /* --------------------------------- full UI flow with a brand-new user */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx2.newPage();
  watch(p);
  const id = Math.random().toString(36).slice(2, 7);
  await p.goto(`${BASE}/signup`);
  await p.fill("#displayName", "UI Tester");
  await p.fill("#email", `ui_${id}@test.dev`);
  await p.fill("#username", `ui_${id}`);
  await p.fill("#password", "password123");
  await p.click("button[type=submit]");
  await p.waitForURL(new RegExp(`/u/ui_${id}`));
  await settle(p, 1500);
  check("signup lands on own (empty) profile", await p.getByText("Build your first shelf").isVisible());

  const cats = ["Books", "Music", "Photography", "Travel", "Tech & Gadgets"];
  for (let i = 0; i < 5; i++) {
    await (i === 0 ? p.getByRole("button", { name: "Add a shelf" }) : p.getByTestId("add-shelf")).click();
    await p.fill("#shelf-name", `Shelf ${i + 1}`);
    await p.click("#shelf-cat");
    await p.getByRole("searchbox", { name: "Search categories" }).fill(cats[i].split(" ")[0]);
    await p.getByRole("option", { name: new RegExp(cats[i]) }).first().click();
    await p.getByRole("button", { name: "Create shelf" }).click();
    await p.getByRole("region", { name: `Shelf ${i + 1}` }).waitFor();
  }
  check("5 shelves created through the UI", (await p.locator("[data-shelf-id]").count()) === 5);
  check("6th shelf blocked in the UI", (await p.getByTestId("add-shelf").textContent())?.includes("Shelf limit reached") ?? false);
  await p.getByTestId("add-shelf").dispatchEvent("click");
  await settle(p, 500);
  check("toast explains the limit", await p.getByText(/holds at most 5 shelves/).isVisible());

  // add a link item to shelf 1
  await p.getByRole("button", { name: "Add item to Shelf 1" }).click();
  await p.fill("#item-url", "https://github.com/vercel/next.js");
  await p.waitForSelector("[data-testid=link-preview]", { timeout: 20000 });
  await p.getByTestId("add-item-submit").click();
  await p.locator('[data-shelf-id] [data-flip-id]').first().waitFor({ timeout: 30000 });
  check("link item added; card shows the fetched thumbnail", await p.locator('section[aria-label="Shelf 1"] img[src^="/api/uploads/"]').first().isVisible());
  await settle(p, 1500);

  // add a photo item to shelf 3
  const png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#7c3aed" } }).png().toBuffer();
  const tmp = path.join(OUT, ".tmp-photo.png");
  fs.writeFileSync(tmp, png);
  await p.getByRole("button", { name: "Add item to Shelf 3" }).click();
  await p.getByRole("tab", { name: /Photo/ }).click();
  await p.setInputFiles("[data-testid=photo-input]", tmp);
  await p.fill("#item-title", "Purple wall");
  await p.getByTestId("add-item-submit").click();
  await p.locator('section[aria-label="Shelf 3"] [data-flip-id]').first().waitFor({ timeout: 30000 });
  fs.rmSync(tmp);
  check("photo item added", await p.locator('section[aria-label="Shelf 3"] img[alt="Purple wall"]').isVisible());
  await settle(p, 1200);

  // timeline shows both
  await p.getByTestId("tab-timeline").click();
  await settle(p, 1500);
  const entries = await p.locator("[data-testid=timeline-entry]").allTextContents();
  check("timeline shows both new items", entries.length === 2 && entries.some((t) => t.includes("Purple wall")) && entries.some((t) => /next\.js/i.test(t)), `${entries.length} entries`);
  await shot(p, "08-timeline-new-user");
  await p.getByTestId("tab-shelves").click();

  // page switcher + paywall + demo upgrade
  check("no 2nd page yet: switcher shows one page", (await p.locator("[data-page-id]").count()) === 1);
  await p.getByTestId("new-page").click();
  await p.waitForSelector("[data-testid=paywall]");
  check("paywall appears when creating a 2nd page", true);
  await p.getByTestId("upgrade-button").click();
  await p.waitForSelector("#page-title", { timeout: 10000 });
  await p.fill("#page-title", "Wishlist");
  await p.getByRole("button", { name: "Create page" }).click();
  await p.waitForSelector('[data-page-id][aria-selected="true"]:has-text("Wishlist")');
  check("after demo upgrade a 2nd page is created and selected", true);
  check("new page starts empty", await p.getByText("Build your first shelf").isVisible());
  await p.locator('[data-page-id]:has-text("My Collections")').click();
  await settle(p, 1200);
  check("page switcher returns to the first page with its shelves", (await p.locator("[data-shelf-id]").count()) === 5);
  check("URL keeps selected page", p.url().includes("page="));
  await shot(p, "09-switcher-after-upgrade");

  // edit + delete item through the modal
  await p.locator('section[aria-label="Shelf 3"] [data-flip-id] button').first().click();
  await p.getByRole("button", { name: "Edit", exact: true }).click();
  await p.fill("#edit-title", "Purple wall (edited)");
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await p.waitForSelector("text=Purple wall (edited)");
  await p.getByRole("button", { name: "Delete", exact: true }).first().click();
  await p.getByRole("button", { name: "Delete", exact: true }).last().click();
  await p.waitForSelector('section[aria-label="Shelf 3"] >> text=This shelf is empty');
  check("edit then delete item", true);

  // visitor view: other users can't see owner controls
  const vctx = await browser.newContext();
  const vp = await vctx.newPage();
  await vp.goto(`${BASE}/u/ui_${id}`);
  await settle(vp, 1000);
  check("public visitor sees no owner controls", (await vp.getByRole("button", { name: /Add item/ }).count()) === 0 && (await vp.getByTestId("new-page").count()) === 0);
  await vctx.close();
  await ctx2.close();

  await browser.close();
  const real = errors.filter((e) => !/favicon|Failed to load resource.*(401|402|422)/i.test(e));
  check("no unexpected browser console errors", real.length === 0, real.slice(0, 3).join(" | "));
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll UI checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
