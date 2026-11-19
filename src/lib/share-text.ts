/** Plain-text list of a shelf's items for pasting anywhere (chat, notes, social). */
export function shelfShareText(titles: string[], origin: string, username: string): string {
  const list = titles.map((t, i) => `${i + 1}. ${t.trim()}`).join("\n");
  return `${list}\n\nShared from Museo. Check out my Museo profile -> ${origin.replace(/\/$/, "")}/u/${username}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
