/* Scripted end-to-end check against a running server: BASE_URL (default http://localhost:3000). */
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

class Client {
  cookie = "";
  async req(path: string, init: { method?: string; json?: unknown; form?: FormData; headers?: Record<string, string> } = {}) {
    const res = await fetch(BASE + path, {
      method: init.method ?? (init.json || init.form ? "POST" : "GET"),
      headers: { ...(init.json ? { "content-type": "application/json" } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), ...init.headers },
      body: init.form ?? (init.json ? JSON.stringify(init.json) : undefined),
      redirect: "manual",
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      if (pair.endsWith("=") || /expires=Thu, 01 Jan 1970/i.test(c)) this.cookie = "";
      else this.cookie = pair;
    }
    const type = res.headers.get("content-type") ?? "";
    const body = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, body, headers: res.headers };
  }
}

async function main() {
  const id = Math.random().toString(36).slice(2, 8);
  const a = new Client();
  const b = new Client();

  // --- auth
  let r = await a.req("/api/auth/signup", { json: { email: `a_${id}@test.dev`, username: `a_${id}`, password: "short" } });
  check("signup rejects weak password", r.status === 400, r.body?.error?.message);
  r = await a.req("/api/auth/signup", { json: { email: `a_${id}@test.dev`, username: `a_${id}`, displayName: "Tester A", password: "password123" } });
  check("sign up", r.status === 201 && Boolean(a.cookie), `status ${r.status}`);
  r = await a.req("/api/auth/signup", { json: { email: `a_${id}@test.dev`, username: `x_${id}`, password: "password123" } });
  check("duplicate email rejected", r.status === 409);
  r = await b.req("/api/auth/signup", { json: { email: `b_${id}@test.dev`, username: `b_${id}`, password: "password123" } });
  check("second user signs up", r.status === 201);
  r = await new Client().req("/api/auth/login", { json: { email: `a_${id}@test.dev`, password: "wrongpass" } });
  check("bad login rejected", r.status === 401);
  r = await new Client().req("/api/pages");
  check("unauthenticated API call → 401", r.status === 401);
  r = await a.req("/api/pages", { json: { title: "x" }, headers: { origin: "https://evil.example" } });
  check("cross-origin POST blocked (CSRF)", r.status === 403);

  // --- pages & paywall
  r = await a.req("/api/pages");
  const page1 = r.body.pages[0];
  check("first page exists from signup", r.body.pages.length === 1, page1?.title);
  r = await a.req("/api/pages", { json: { title: "Second page", emoji: "🎧" } });
  check("second page blocked by paywall (402)", r.status === 402 && r.body.error.code === "PAYWALL");

  // --- shelves & limit
  const cats = ["books", "music", "photography", "travel", "tech"];
  let ok = true;
  const shelfIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    r = await a.req(`/api/pages/${page1.id}/shelves`, { json: { name: `Shelf ${i + 1}`, category: cats[i] } });
    if (r.status !== 201) ok = false;
    shelfIds.push(r.body.shelf?.id);
  }
  check("created 5 shelves", ok);
  r = await a.req(`/api/pages/${page1.id}/shelves`, { json: { name: "Sixth", category: "art" } });
  check("6th shelf rejected (422 SHELF_LIMIT)", r.status === 422 && r.body.error.code === "SHELF_LIMIT", r.body?.error?.message);
  r = await a.req(`/api/pages/${page1.id}/shelves`, { json: { name: "Bad", category: "not-a-category" } });
  check("invalid category rejected by zod", r.status === 400);
  r = await b.req(`/api/pages/${page1.id}/shelves`, { json: { name: "Hack", category: "art" } });
  check("other user cannot add shelf to my page (403)", r.status === 403);

  // --- link item (real site)
  let form = new FormData();
  form.set("type", "LINK");
  form.set("url", "https://github.com/vercel/next.js");
  r = await a.req(`/api/shelves/${shelfIds[0]}/items`, { form });
  const linkItem = r.body.item;
  check("add link item (github.com)", r.status === 201, `title="${linkItem?.title}"`);
  check("title prefilled from page", Boolean(linkItem?.title) && linkItem.title !== "Untitled link");
  check("description prefilled from page", Boolean(linkItem?.description), String(linkItem?.description).slice(0, 60));
  check("thumbnail fetched & cached locally", /^\/api\/uploads\/[a-f0-9]{32}\.(webp|ico)$/.test(linkItem?.imageUrl ?? ""), linkItem?.imageUrl);
  if (linkItem?.imageUrl) {
    const img = await fetch(BASE + linkItem.imageUrl);
    check("thumbnail is served as an image", img.status === 200 && (img.headers.get("content-type") ?? "").startsWith("image/"), img.headers.get("content-type") ?? "");
  }
  form = new FormData();
  form.set("type", "LINK");
  form.set("url", "https://github.com/vercel/next.js");
  form.set("title", "My custom title");
  form.set("description", "my note");
  r = await a.req(`/api/shelves/${shelfIds[0]}/items`, { form });
  check("user-provided title/description win over prefill", r.body.item?.title === "My custom title" && r.body.item?.description === "my note");

  // --- SSRF
  for (const u of ["http://127.0.0.1:3000/", "http://localhost:3000/api/me", "http://169.254.169.254/latest/meta-data/", "http://[::1]:3000/", "file:///etc/passwd"]) {
    r = await a.req(`/api/preview?url=${encodeURIComponent(u)}`);
    check(`SSRF blocked: ${u}`, r.status === 400, r.body?.error?.message);
  }
  form = new FormData();
  form.set("type", "LINK");
  form.set("url", "http://127.0.0.1:3000/");
  r = await a.req(`/api/shelves/${shelfIds[0]}/items`, { form });
  check("SSRF blocked when adding an item", r.status === 400);

  // --- photo item
  const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#ff5a2c" } }).png().toBuffer();
  form = new FormData();
  form.set("type", "PHOTO");
  form.set("title", "Orange square");
  form.set("description", "Test photo");
  form.set("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "orange.png");
  r = await a.req(`/api/shelves/${shelfIds[2]}/items`, { form });
  check("add photo item", r.status === 201 && r.body.item?.type === "PHOTO", r.body?.error?.message);
  check("photo stored under uploads", /^\/api\/uploads\/[a-f0-9]{32}\.webp$/.test(r.body.item?.imageUrl ?? ""));
  form = new FormData();
  form.set("type", "PHOTO");
  form.set("title", "Fake");
  form.set("file", new Blob(["<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"], { type: "image/png" }), "fake.png");
  r = await a.req(`/api/shelves/${shelfIds[2]}/items`, { form });
  check("non-image upload rejected (even if labelled image/png)", r.status === 400, r.body?.error?.message);
  form = new FormData();
  form.set("type", "PHOTO");
  form.set("title", "Huge");
  form.set("file", new Blob([new Uint8Array(9 * 1024 * 1024)], { type: "image/png" }), "huge.png");
  r = await a.req(`/api/shelves/${shelfIds[2]}/items`, { form });
  check("9MB upload rejected (limit 8MB)", r.status === 400, r.body?.error?.message);
  form = new FormData();
  form.set("type", "PHOTO");
  form.set("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "x.png");
  r = await a.req(`/api/shelves/${shelfIds[2]}/items`, { form });
  check("photo without title rejected", r.status === 400);
  r = await fetch(BASE + "/api/uploads/../../.env");
  check("upload path traversal blocked", r.status === 404);

  // --- authorization on items
  r = await b.req(`/api/items/${linkItem.id}`, { method: "PATCH", json: { title: "pwned" } });
  check("other user cannot edit my item (403)", r.status === 403);
  r = await b.req(`/api/items/${linkItem.id}`, { method: "DELETE" });
  check("other user cannot delete my item (403)", r.status === 403);
  r = await a.req(`/api/items/${linkItem.id}`, { method: "PATCH", json: { title: "Next.js — edited" } });
  check("owner can edit item", r.status === 200 && r.body.item.title === "Next.js — edited");

  // --- timeline
  r = await a.req(`/api/users/a_${id}/timeline`);
  const titles: string[] = r.body.items.map((i: { title: string }) => i.title);
  check("timeline lists link + photo, newest first", titles.includes("Next.js — edited") && titles.includes("Orange square") && titles[0] === "Orange square", titles.join(" | "));
  r = await new Client().req(`/u/a_${id}`);
  check("public profile page visible without login", r.status === 200 && String(r.body).includes("Tester A"));

  // --- reorder
  r = await a.req(`/api/users/a_${id}/timeline`);
  r = await a.req("/api/pages");
  const items = r.body.pages[0].shelves[0].items.map((i: { id: string }) => i.id).reverse();
  r = await a.req(`/api/shelves/${shelfIds[0]}/reorder`, { json: { itemIds: items } });
  check("reorder items", r.status === 200);

  // --- upgrade & second page
  r = await a.req("/api/billing/checkout", { method: "POST", json: {} });
  check("stripe checkout unavailable in demo mode (400)", r.status === 400);
  r = await a.req("/api/billing/demo-upgrade", { method: "POST", json: {} });
  check("demo upgrade marks user subscribed", r.status === 200 && r.body.user.subscribed === true);
  r = await a.req("/api/pages", { json: { title: "Second page", emoji: "🎧" } });
  check("second page allowed after upgrade", r.status === 201);
  const page2 = r.body.page;
  r = await a.req(`/api/pages/${page2.id}/shelves`, { json: { name: "P2 shelf", category: "music" } });
  check("second page gets its own 5-shelf allowance", r.status === 201);
  r = await a.req(`/u/a_${id}?page=${page2.id}`);
  check("page switcher URL renders both pages", r.status === 200 && String(r.body).includes("Second page") && String(r.body).includes("My Collections"));
  r = await a.req(`/api/pages/${page2.id}`, { method: "DELETE" });
  check("delete page", r.status === 200);

  // --- follow + feed
  r = await b.req(`/api/users/a_${id}/follow`, { method: "POST", json: {} });
  check("follow", r.status === 200);
  r = await b.req("/api/feed?scope=following");
  check("following feed shows followed user's items", r.status === 200 && r.body.items.some((i: { user: { username: string } }) => i.user.username === `a_${id}`));
  r = await new Client().req("/api/feed?scope=global");
  check("global feed is public", r.status === 200 && r.body.items.length > 0);

  // --- logout
  r = await a.req("/api/auth/logout", { method: "POST", json: {} });
  r = await a.req("/api/pages");
  check("logout invalidates session", r.status === 401);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed ✅");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
