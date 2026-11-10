/* Seeds demo accounts + sample collections. Safe to re-run (recreates the demo users). */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { renderArt, type Motif } from "./seed-art";

const db = new PrismaClient();
const seedDir = path.resolve(process.cwd(), "public/seed");
fs.mkdirSync(seedDir, { recursive: true });

type Pal = [string, string, string];
const PAL: Record<string, Pal> = {
  ember: ["#ff5a2c", "#ffb020", "#7c2d12"], plum: ["#7c3aed", "#ec4899", "#fde047"], ocean: ["#0ea5e9", "#22c55e", "#fef08a"],
  rose: ["#f43f5e", "#f59e0b", "#1e1b4b"], teal: ["#14b8a6", "#6366f1", "#fde68a"], lime: ["#84cc16", "#06b6d4", "#14532d"],
  fuchsia: ["#d946ef", "#3b82f6", "#fde047"], crimson: ["#ef4444", "#f97316", "#fff7ed"], night: ["#1e293b", "#475569", "#38bdf8"],
  forest: ["#166534", "#4d7c0f", "#bbf7d0"], sand: ["#d97706", "#fbbf24", "#78350f"], sky: ["#38bdf8", "#818cf8", "#fff"],
};

let art = 0;
function image(motif: Motif, pal: keyof typeof PAL, label: string): string {
  const slug = `${String(++art).padStart(2, "0")}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  fs.writeFileSync(path.join(seedDir, `${slug}.svg`), renderArt(motif, PAL[pal], label));
  return `/seed/${slug}.svg`;
}

interface SeedItem { title: string; description?: string; url?: string; site?: string; img: string }
interface SeedShelf { name: string; category: string; items: SeedItem[] }
interface SeedPage { title: string; description: string; shelves: SeedShelf[] }
interface SeedUser { email: string; username: string; displayName: string; bio: string; password: string; subscribed: boolean; pages: SeedPage[]; follows: string[] }

const wiki = (t: string) => `https://en.wikipedia.org/wiki/${t}`;
const link = (title: string, url: string, site: string, img: string, description = ""): SeedItem => ({ title, url, site, img, description });
const photo = (title: string, img: string, description = ""): SeedItem => ({ title, img, description });

const USERS: SeedUser[] = [
  {
    email: "demo@shelfie.app", username: "demo", displayName: "Demo Collector", password: "demo1234", subscribed: false,
    bio: "Good books, better records, and open-source gems I keep coming back to.",
    follows: ["maya", "kenji"],
    pages: [{
      title: "My Collections", description: "The things I can't stop collecting.",
      shelves: [
        { name: "Currently reading", category: "books", items: [
          link("Dune", wiki("Dune_(novel)"), "Wikipedia", image("book", "ember", "Dune"), "Sand, spice and politics. Third read-through."),
          link("Project Hail Mary", wiki("Project_Hail_Mary"), "Wikipedia", image("book", "ocean", "Project Hail Mary"), "Best book I read this year. No spoilers!"),
          link("The Pragmatic Programmer", wiki("The_Pragmatic_Programmer"), "Wikipedia", image("book", "night", "The Pragmatic Programmer")),
          link("Thinking, Fast and Slow", wiki("Thinking,_Fast_and_Slow"), "Wikipedia", image("book", "plum", "Thinking, Fast and Slow")),
        ] },
        { name: "On repeat", category: "music", items: [
          link("Kind of Blue", wiki("Kind_of_Blue"), "Wikipedia", image("vinyl", "night", "Kind of Blue"), "The one record I'd save from a fire."),
          link("Random Access Memories", wiki("Random_Access_Memories"), "Wikipedia", image("vinyl", "fuchsia", "Random Access Memories")),
          link("Rumours", wiki("Rumours_(album)"), "Wikipedia", image("vinyl", "sand", "Rumours")),
          link("In Rainbows", wiki("In_Rainbows"), "Wikipedia", image("vinyl", "rose", "In Rainbows")),
        ] },
        { name: "Open source I love", category: "code", items: [
          link("vercel/next.js", "https://github.com/vercel/next.js", "GitHub", image("code", "night", "next.js"), "The React framework this very app runs on."),
          link("greensock/GSAP", "https://github.com/greensock/GSAP", "GitHub", image("code", "lime", "GSAP"), "Every animation on this page."),
          link("prisma/prisma", "https://github.com/prisma/prisma", "GitHub", image("code", "teal", "Prisma")),
          link("tailwindlabs/tailwindcss", "https://github.com/tailwindlabs/tailwindcss", "GitHub", image("code", "sky", "Tailwind CSS")),
        ] },
        { name: "Desk setup", category: "tech", items: [
          photo("Mechanical keyboard", image("gadget", "plum", "Keyboard"), "Lubed switches. Worth every hour."),
          photo("Studio display", image("gadget", "ocean", "Display")),
          photo("Pixel art mousepad", image("pixel", "crimson", "Pixel pad")),
        ] },
      ],
    }],
  },
  {
    email: "maya@shelfie.app", username: "maya", displayName: "Maya Ortiz", password: "maya1234", subscribed: true,
    bio: "Plant parent, trail snack connoisseur, amateur photographer",
    follows: ["demo"],
    pages: [
      { title: "Plant Parent", description: "34 plants and counting. Send help.", shelves: [
        { name: "Leafy friends", category: "plants", items: [
          photo("Monstera deliciosa", image("plant", "forest", "Monstera"), "Grew three new leaves this month!"),
          photo("String of pearls", image("plant", "lime", "String of Pearls")),
          photo("Fiddle leaf fig", image("plant", "teal", "Fiddle Leaf Fig")),
          photo("Snake plant", image("plant", "sand", "Snake Plant")),
        ] },
        { name: "Pots & planters", category: "home", items: [
          link("Terracotta classics", wiki("Terracotta"), "Wikipedia", image("bowl", "ember", "Terracotta")),
          link("Self-watering planters", wiki("Self-watering_container"), "Wikipedia", image("bowl", "ocean", "Self-watering")),
        ] },
      ] },
      { title: "Travel Log", description: "Places, plates and photos from the road.", shelves: [
        { name: "Places I've been", category: "travel", items: [
          photo("Lisbon rooftops", image("polaroid", "sand", "Lisbon"), "Golden hour from Alfama."),
          photo("Patagonia", image("mountain", "ocean", "Patagonia")),
          photo("Kyoto in autumn", image("polaroid", "crimson", "Kyoto")),
          photo("Dolomites", image("mountain", "plum", "Dolomites")),
        ] },
        { name: "Trail snacks", category: "food", items: [
          link("Onigiri", wiki("Onigiri"), "Wikipedia", image("bowl", "rose", "Onigiri")),
          link("Pastel de nata", wiki("Pastel_de_nata"), "Wikipedia", image("bowl", "sand", "Pastel de Nata")),
        ] },
        { name: "Shots I'm proud of", category: "photography", items: [
          photo("Blue hour", image("polaroid", "night", "Blue hour")),
          photo("Mist over the valley", image("mountain", "teal", "Mist")),
          photo("Neon rain", image("polaroid", "fuchsia", "Neon rain")),
        ] },
      ] },
    ],
  },
  {
    email: "kenji@shelfie.app", username: "kenji", displayName: "Kenji Watanabe", password: "kenji1234", subscribed: false,
    bio: "Retro games, midnight movies, pixel everything.", follows: ["demo"],
    pages: [{ title: "Pixel Vault", description: "Games and films that shaped me.", shelves: [
      { name: "Retro favourites", category: "games", items: [
        link("Super Metroid", wiki("Super_Metroid"), "Wikipedia", image("pixel", "plum", "Super Metroid")),
        link("Celeste", wiki("Celeste_(video_game)"), "Wikipedia", image("mountain", "fuchsia", "Celeste")),
        link("Hades", wiki("Hades_(video_game)"), "Wikipedia", image("bauhaus", "crimson", "Hades")),
        link("Tetris", wiki("Tetris"), "Wikipedia", image("pixel", "ocean", "Tetris")),
      ] },
      { name: "Movie nights", category: "film-tv", items: [
        link("Blade Runner", wiki("Blade_Runner"), "Wikipedia", image("film", "night", "Blade Runner")),
        link("Spirited Away", wiki("Spirited_Away"), "Wikipedia", image("film", "teal", "Spirited Away")),
        link("Akira", wiki("Akira_(1988_film)"), "Wikipedia", image("film", "rose", "Akira")),
      ] },
    ] }],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    console.error("Refusing to seed demo accounts with public passwords in production. Set ALLOW_SEED=1 to override.");
    process.exit(1);
  }
  await db.user.deleteMany({ where: { email: { in: USERS.map((u) => u.email) } } });
  const now = Date.now();
  let hoursAgo = 1.5;
  const ids = new Map<string, string>();

  for (const u of USERS) {
    const user = await db.user.create({
      data: {
        email: u.email, username: u.username, displayName: u.displayName, bio: u.bio,
        passwordHash: await bcrypt.hash(u.password, 11),
        subscribed: u.subscribed, subscriptionStatus: u.subscribed ? "demo" : "none",
      },
    });
    ids.set(u.username, user.id);
    let pagePos = 0;
    for (const p of u.pages) {
      const page = await db.page.create({ data: { userId: user.id, title: p.title, description: p.description, position: pagePos++ } });
      let shelfPos = 0;
      for (const s of p.shelves) {
        const shelf = await db.shelf.create({ data: { pageId: page.id, name: s.name, category: s.category, position: shelfPos++ } });
        let pos = 0;
        for (const it of s.items) {
          hoursAgo += 3 + ((pos * 7 + shelfPos * 5 + user.username.length) % 9) * 1.7;
          await db.item.create({
            data: {
              shelfId: shelf.id, userId: user.id, type: it.url ? "LINK" : "PHOTO", url: it.url ?? null, imageUrl: it.img,
              title: it.title, description: it.description ?? "", siteName: it.site ?? null, position: pos++,
              createdAt: new Date(now - hoursAgo * 3600_000),
            },
          });
        }
      }
    }
  }
  for (const u of USERS) {
    for (const f of u.follows) {
      await db.follow.create({ data: { followerId: ids.get(u.username)!, followingId: ids.get(f)! } });
    }
  }
  console.log(`Seeded ${USERS.length} users. Demo login: demo@shelfie.app / demo1234`);
}

main().finally(() => db.$disconnect());
