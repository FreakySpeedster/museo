const IRREGULAR: Record<string, string> = { reply: "replies", person: "people", story: "stories" };

/** The word for a count: plural("follower", 1) → "follower", plural("follower", 2) → "followers". */
export function plural(word: string, n: number, many?: string): string {
  if (Math.abs(n) === 1) return word;
  return many ?? IRREGULAR[word] ?? `${word}s`;
}

/** Count plus word: count(1, "follower") → "1 follower", count(1200, "view") → "1,200 views". */
export function count(n: number, word: string, many?: string): string {
  return `${n.toLocaleString("en-US")} ${plural(word, n, many)}`;
}
