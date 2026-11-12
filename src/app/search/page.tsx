import type { Metadata } from "next";
import { SearchPage } from "@/components/search/SearchPage";
import type { SearchSort, SearchType } from "@/lib/dto";

export const metadata: Metadata = { title: "Search" };

const TYPES = new Set<SearchType>(["all", "people", "items", "shelves"]);
const SORTS = new Set<SearchSort>(["relevance", "new", "top"]);

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const type = TYPES.has(sp.type as SearchType) ? (sp.type as SearchType) : "all";
  const sort = SORTS.has(sp.sort as SearchSort) ? (sp.sort as SearchSort) : "relevance";
  return <SearchPage initialQ={q} initialType={type} initialSort={sort} />;
}
