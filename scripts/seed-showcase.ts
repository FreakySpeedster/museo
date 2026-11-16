/* Seeds 4 showcase accounts with real Wikipedia thumbnails stored as WebP assets. Re-runnable. */
import crypto from "node:crypto";
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import sharp from "sharp";

const sql = neon(process.env.DIRECT_URL!);
const id = () => "c" + crypto.randomBytes(12).toString("hex");
type It = [title: string, wiki: string, note?: string];
type Sh = { name: string; category: string; items: It[] };
type U = { username: string; displayName: string; bio: string; socials: { network: string; url: string }[]; shelves: Sh[] };

const USERS: U[] = [
  { username: "aarav", displayName: "Aarav Mehta", bio: "Watch nerd, slow reader, window-seat traveller.",
    socials: [{ network: "instagram", url: "https://instagram.com/aarav" }],
    shelves: [
      { name: "On the wrist", category: "watches", items: [["Omega Speedmaster", "Omega_Speedmaster", "The moonwatch. Worth every rupee."], ["Rolex Submariner", "Rolex_Submariner"], ["Seiko 5", "Seiko_5", "Where it all started."]] },
      { name: "Bedside stack", category: "books", items: [["The God of Small Things", "The_God_of_Small_Things"], ["Sapiens", "Sapiens:_A_Brief_History_of_Humankind"], ["Atomic Habits", "Atomic_Habits"], ["Shantaram", "Shantaram_(novel)", "Read it in Bombay, of course."]] },
      { name: "Next trips", category: "travel", items: [["Ladakh", "Ladakh"], ["Kyoto", "Kyoto", "Autumn leaves, one day."], ["Hampi", "Hampi"]] },
    ] },
  { username: "meera", displayName: "Meera Iyer", bio: "Records, recipes and a balcony full of plants.",
    socials: [{ network: "youtube", url: "https://youtube.com/@meera" }],
    shelves: [
      { name: "Always playing", category: "music", items: [["A Love Supreme", "A_Love_Supreme"], ["Abbey Road", "Abbey_Road", "Side B, start to finish."], ["Roja soundtrack", "Roja_(soundtrack)"], ["Blue", "Blue_(Joni_Mitchell_album)"]] },
      { name: "Comfort food", category: "food", items: [["Masala dosa", "Masala_dosa", "Sunday mornings."], ["Hyderabadi biryani", "Hyderabadi_biryani"], ["Ramen", "Ramen"]] },
      { name: "Balcony garden", category: "plants", items: [["Monstera deliciosa", "Monstera_deliciosa"], ["Tulsi", "Ocimum_tenuiflorum"], ["Bougainvillea", "Bougainvillea"]] },
    ] },
  { username: "kabir", displayName: "Kabir Sethi", bio: "Kicks, cinema and gadgets I probably didn't need.",
    socials: [{ network: "x", url: "https://x.com/kabir" }],
    shelves: [
      { name: "Grails", category: "sneakers", items: [["Air Jordan 1", "Air_Jordan_1"], ["Nike Air Max 90", "Air_Max", "The infrared colourway."], ["Adidas Samba", "Adidas_Samba"]] },
      { name: "Rewatch list", category: "film-tv", items: [["Interstellar", "Interstellar_(film)"], ["Gangs of Wasseypur", "Gangs_of_Wasseypur", "Peak Indian cinema."], ["Spirited Away", "Spirited_Away"], ["Breaking Bad", "Breaking_Bad"]] },
      { name: "Desk setup", category: "tech", items: [["Steam Deck", "Steam_Deck"], ["Sony WH-1000XM4", "Sony_WH-1000XM4"], ["Raspberry Pi", "Raspberry_Pi", "Running my home server."]] },
    ] },
  { username: "zoya", displayName: "Zoya Khan", bio: "Painter by day, gamer by night. Shooting film in between.",
    socials: [{ network: "website", url: "https://zoyakhan.art" }],
    shelves: [
      { name: "Paintings I'd steal", category: "art", items: [["The Starry Night", "The_Starry_Night"], ["The Great Wave off Kanagawa", "The_Great_Wave_off_Kanagawa", "Hangs above my desk."], ["Raja Ravi Varma's Shakuntala", "Shakuntala_(Raja_Ravi_Varma)"], ["Girl with a Pearl Earring", "Girl_with_a_Pearl_Earring"]] },
      { name: "Camera bag", category: "photography", items: [["Leica M6", "Leica_M6"], ["Kodak Portra", "Kodak_Portra"], ["Fujifilm X100", "Fujifilm_X100_series"]] },
      { name: "Played to the end", category: "games", items: [["Hollow Knight", "Hollow_Knight"], ["The Legend of Zelda: Breath of the Wild", "The_Legend_of_Zelda:_Breath_of_the_Wild"], ["Valorant", "Valorant", "Omen main."]] },
    ] },
];

const UA = { "User-Agent": "nook-seed/1.0 (showcase)" };
async function thumb(wiki: string): Promise<string | null> {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`, { headers: UA });
  if (!r.ok) { console.warn("summary", wiki, r.status); return null; }
  const j: any = await r.json();
  const src = j.thumbnail?.source?.replace(/\/\d+px-/, "/800px-") ?? j.originalimage?.source;
  if (!src) { console.warn("no image", wiki); return null; }
  let img = await fetch(src, { headers: UA });
  if (!img.ok && j.originalimage?.source) img = await fetch(j.originalimage.source, { headers: UA });
  if (!img.ok) { console.warn("img", wiki, img.status); return null; }
  const webp = await sharp(Buffer.from(await img.arrayBuffer())).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const name = `${crypto.randomUUID()}.webp`;
  await sql`insert into "Asset"(name,"contentType",data,size) values (${name},${"image/webp"},decode(${webp.toString("hex")},'hex'),${webp.length})`;
  return `/api/uploads/${name}`;
}

async function main() {
  const creds: string[] = [];
  for (const u of USERS) {
    const ex = await sql`select id,email from "User" where username=${u.username}`;
    if (ex[0] && !String(ex[0].email).endsWith("@nook.demo")) throw new Error(`username taken: ${u.username}`);
    if (ex[0]) await sql`delete from "User" where id=${ex[0].id}`;
    const password = crypto.randomBytes(9).toString("base64url");
    const uid = id(), pid = id();
    await sql`insert into "User"(id,email,username,"displayName",bio,"socialLinks","passwordHash","updatedAt") values (${uid},${u.username + "@nook.demo"},${u.username},${u.displayName},${u.bio},${JSON.stringify(u.socials)}::jsonb,${await bcrypt.hash(password, 10)},now())`;
    creds.push(`${u.username}@nook.demo ${password}`);
    await sql`insert into "Page"(id,"userId",title,position,"updatedAt") values (${pid},${uid},${"My Collections"},0,now())`;
    for (const [si, s] of u.shelves.entries()) {
      const sid = id();
      await sql`insert into "Shelf"(id,"pageId",name,category,position) values (${sid},${pid},${s.name},${s.category},${si})`;
      const imgs = await Promise.all(s.items.map(([, w]) => thumb(w)));
      for (const [ii, [title, wiki, note]] of s.items.entries()) {
        await sql`insert into "Item"(id,"shelfId","userId",type,url,"imageUrl","faviconUrl",title,description,"siteName",position,"updatedAt") values (${id()},${sid},${uid},${"LINK"},${"https://en.wikipedia.org/wiki/" + wiki},${imgs[ii]},${"https://en.wikipedia.org/static/favicon/wikipedia.ico"},${title},${note ?? ""},${"Wikipedia"},${ii},now())`;
      }
    }
    console.log("done", u.username);
  }
  fs.mkdirSync("/workspace/.secrets", { recursive: true });
  fs.writeFileSync("/workspace/.secrets/nook-showcase-accounts.txt", creds.join("\n") + "\n", { mode: 0o600 });
}
main();
