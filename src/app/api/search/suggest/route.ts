import { route, ok } from "@/lib/api";
import { searchSuggestions } from "@/lib/services/search";

export const GET = route(async ({ user }) => ok(await searchSuggestions(user?.id)), { limit: { key: "search-suggest", max: 60, windowMs: 60_000 } });
