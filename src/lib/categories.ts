import {
  Amphora, Anchor, Armchair, Baby, Beer, Bike, BookMarked, BookOpen, Box, Boxes, Brush, Building2, Cake, Camera, Car,
  Clapperboard, Coffee, Coins, CookingPot, Cpu, Crown, Dices, Disc3, Dog, Dumbbell, Fish, Flame, Flower2, FlaskConical,
  Footprints, Gamepad2, Gem, Glasses, GraduationCap, Guitar, Hammer, Headphones, Keyboard, Landmark, Laptop, Leaf,   Map as MapIcon, MapPin, Medal, Monitor, Mountain, Newspaper, Package, Palette, PenTool, Pizza, Plane, Puzzle, Radio, Rocket, Scissors, Scroll, Shirt, ShoppingBag, Sailboat, Smartphone, Sofa, Sparkles, Sprout, Stamp,
  Swords, Tag, Telescope, Tent, Ticket, Trophy, Tv, Utensils, Watch, Wine, Blocks, Code, Compass, Heart, Martini, Mic2, Film,
  type LucideIcon,
} from "lucide-react";

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Extra search words. */
  keywords?: string;
}
export interface CategoryGroup {
  name: string;
  items: CategoryDef[];
}

const c = (id: string, label: string, icon: LucideIcon, keywords = ""): CategoryDef => ({ id, label, icon, keywords });

/** Existing ids (books, music, film-tv, games, art, photography, fashion, food, travel, tech, plants, home, toys, code, reading, other) are kept for stored shelves. */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Fashion & Accessories",
    items: [
      c("fashion", "Fashion & Clothing", Shirt, "clothes apparel outfits"),
      c("sneakers", "Sneakers", Footprints, "shoes kicks footwear"),
      c("watches", "Watches", Watch, "timepieces horology"),
      c("fragrance", "Fragrance", FlaskConical, "perfume cologne scent attar"),
      c("jewelry", "Jewelry", Gem, "rings necklaces bracelets"),
      c("bags", "Bags & Wallets", ShoppingBag, "handbags backpacks purses"),
      c("eyewear", "Eyewear", Glasses, "sunglasses glasses frames"),
      c("headwear", "Hats & Caps", Crown, "cap beanie hat"),
      c("beauty", "Beauty & Skincare", Sparkles, "makeup cosmetics grooming"),
    ],
  },
  {
    name: "Media",
    items: [
      c("books", "Books", BookOpen, "novels reading fiction"),
      c("comics", "Comics & Manga", BookMarked, "graphic novels manga"),
      c("music", "Music", Headphones, "albums songs playlists"),
      c("vinyl", "Vinyl & Records", Disc3, "lp turntable cd cassette"),
      c("film-tv", "Film & TV", Clapperboard, "movies series shows"),
      c("anime", "Anime & Animation", Tv, "cartoons"),
      c("podcasts", "Podcasts & Radio", Radio, "audio shows"),
      c("reading", "Articles & Reads", Newspaper, "blog essays magazines news"),
      c("posters", "Posters & Prints", Film, "wall art"),
    ],
  },
  {
    name: "Games & Play",
    items: [
      c("games", "Video Games", Gamepad2, "console pc steam playstation nintendo xbox"),
      c("board-games", "Board & Card Games", Dices, "tabletop"),
      c("puzzles", "Puzzles", Puzzle, "jigsaw rubik"),
      c("tcg", "Trading Cards", Swords, "pokemon magic tcg sports cards"),
    ],
  },
  {
    name: "Hobbies & Collectibles",
    items: [
      c("toys", "Toys & Figures", Baby, "plush"),
      c("action-figures", "Action Figures", Rocket, "statues funko"),
      c("lego", "LEGO & Building Sets", Blocks, "bricks construction"),
      c("models", "Scale Models", Package, "diecast kits"),
      c("coins", "Coins & Currency", Coins, "numismatics banknotes"),
      c("stamps", "Stamps & Postcards", Stamp, "philately"),
      c("antiques", "Antiques & Vintage", Amphora, "retro"),
      c("memorabilia", "Memorabilia & Autographs", Medal, "signed souvenirs"),
      c("crafts", "Crafts & DIY", Scissors, "knitting sewing woodworking"),
    ],
  },
  {
    name: "Tech",
    items: [
      c("tech", "Tech & Gadgets", Cpu, "electronics devices"),
      c("phones", "Phones & Tablets", Smartphone, "mobile ipad"),
      c("computers", "Computers & Setups", Laptop, "desk setup pc laptop mac"),
      c("keyboards", "Keyboards & Peripherals", Keyboard, "mechanical mouse"),
      c("audio", "Audio Gear", Mic2, "speakers headphones amps"),
      c("displays", "Monitors & Screens", Monitor, "tv display"),
      c("code", "Code & Projects", Code, "software open source github side projects"),
      c("science", "Science & Space", Telescope, "astronomy physics"),
    ],
  },
  {
    name: "Creative",
    items: [
      c("art", "Art & Design", Palette, "painting illustration graphic"),
      c("photography", "Photography", Camera, "photos cameras lenses"),
      c("drawing", "Drawing & Sketching", PenTool, "sketchbook ink"),
      c("stationery", "Stationery & Pens", Brush, "notebooks journals"),
      c("instruments", "Instruments", Guitar, "guitar synth drums piano percussion"),
    ],
  },
  {
    name: "Home & Living",
    items: [
      c("home", "Home & Decor", Sofa, "interior"),
      c("furniture", "Furniture", Armchair, "chairs tables"),
      c("kitchen", "Kitchen & Cookware", CookingPot, "knives cookware appliances"),
      c("plants", "Plants & Garden", Sprout, "houseplants succulents gardening"),
      c("tools", "Tools & Workshop", Hammer, "diy hardware"),
      c("pets", "Pets & Animals", Dog, "dogs cats aquarium"),
      c("flowers", "Flowers & Floral", Flower2, "bouquets"),
    ],
  },
  {
    name: "Food & Drink",
    items: [
      c("food", "Food & Recipes", Utensils, "cooking restaurants dishes"),
      c("coffee", "Coffee & Tea", Coffee, "beans brewing"),
      c("wine", "Wine", Wine, "vineyard"),
      c("spirits", "Whisky & Spirits", Martini, "whiskey gin rum bourbon cocktails"),
      c("beer", "Beer & Craft Brews", Beer, "brewery ale"),
      c("snacks", "Snacks & Sweets", Cake, "desserts chocolate candy baking"),
      c("street-food", "Street Food & Pizza", Pizza, ""),
    ],
  },
  {
    name: "Sports & Outdoors",
    items: [
      c("sports", "Sports & Fans", Trophy, "football cricket nba team jerseys"),
      c("fitness", "Fitness & Gym", Dumbbell, "workout lifting"),
      c("cycling", "Cycling", Bike, "bikes bicycle"),
      c("hiking", "Hiking & Camping", Tent, "trails outdoors"),
      c("climbing", "Mountains & Climbing", Mountain, "trekking"),
      c("water-sports", "Water Sports & Sailing", Sailboat, "surf diving kayak"),
      c("fishing", "Fishing", Fish, "angling"),
    ],
  },
  {
    name: "Travel & Places",
    items: [
      c("travel", "Travel", Compass, "trips adventures"),
      c("destinations", "Places & Destinations", MapPin, "bucket list"),
      c("cities", "Cities & Architecture", Building2, "buildings skyline"),
      c("maps", "Maps & Atlases", MapIcon, ""),
      c("flights", "Flights & Airlines", Plane, "aviation planes"),
      c("culture", "Museums & Culture", Landmark, "history heritage"),
    ],
  },
  {
    name: "Vehicles",
    items: [
      c("cars", "Cars", Car, "automotive supercars"),
      c("motorcycles", "Motorcycles", Flame, "bikes motorbike"),
      c("boats", "Boats & Ships", Anchor, ""),
    ],
  },
  {
    name: "Learning & Life",
    items: [
      c("courses", "Courses & Learning", GraduationCap, "study education"),
      c("manuscripts", "Notes & Writing", Scroll, "poems journal"),
      c("events", "Events & Tickets", Ticket, "concerts festivals"),
      c("wellness", "Wellness & Self-care", Heart, "yoga meditation health"),
      c("nature", "Nature & Wildlife", Leaf, "birds"),
      c("storage", "Boxes & Archives", Boxes, ""),
    ],
  },
  { name: "Other", items: [c("other", "Other", Box, "misc everything else")] },
];

export const CUSTOM_PREFIX = "custom:";
export const CUSTOM_MAX = 30;

const ALL: CategoryDef[] = CATEGORY_GROUPS.flatMap((g) => g.items);
export const CATEGORY_IDS = ALL.map((x) => x.id);
const BY_ID = new Map(ALL.map((x) => [x.id, x] as const));
const OTHER = BY_ID.get("other")!;

export const isCustomCategory = (id: string) => id.startsWith(CUSTOM_PREFIX);
export const customLabel = (id: string) => id.slice(CUSTOM_PREFIX.length).trim();
export const makeCustomCategory = (label: string) => CUSTOM_PREFIX + label.replace(/\s+/g, " ").trim().slice(0, CUSTOM_MAX);

export function isValidCategory(id: string): boolean {
  if (BY_ID.has(id)) return true;
  return isCustomCategory(id) && customLabel(id).length >= 1 && customLabel(id).length <= CUSTOM_MAX;
}

/** Resolve any stored category (known id, custom label, or legacy value) to a label and Lucide icon. */
export function categoryMeta(id: string): { id: string; label: string; icon: LucideIcon } {
  const known = BY_ID.get(id);
  if (known) return known;
  if (isCustomCategory(id)) return { id, label: customLabel(id) || "Custom", icon: Tag };
  return OTHER;
}

export type { LucideIcon };
