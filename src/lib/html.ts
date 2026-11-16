import sanitize from "sanitize-html";

/**
 * Allow-list sanitizer for blog post HTML (written by Tiptap, but never trusted).
 * Runs on save and again on render, so a bad row can never inject script.
 */
const OPTIONS: sanitize.IOptions = {
  allowedTags: ["p", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "del", "strike", "mark", "code", "pre", "blockquote", "ul", "ol", "li", "a", "img", "hr", "br", "span"],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    ol: ["start"],
    code: ["class"],
    "*": ["style"],
  },
  allowedClasses: { code: [/^language-[\w-]+$/] },
  allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow ugc" } }),
    b: "strong",
    i: "em",
    strike: "s",
    del: "s",
  },
  exclusiveFilter: (frame) => frame.tag === "img" && !isSafeImageSrc(frame.attribs.src),
};

/** Images: https anywhere, or our own upload route. */
export function isSafeImageSrc(src?: string): boolean {
  if (!src) return false;
  if (/^\/api\/uploads\/[\w.-]+$/.test(src)) return true;
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeHtml(html: string): string {
  return sanitize(html, OPTIONS);
}

/** Plain text (for excerpts, search and "is it empty?" checks). */
export function htmlToText(html: string): string {
  return sanitize(html.replace(/<\/(p|h[1-4]|li|blockquote|pre)>/gi, " $&").replace(/<br\s*\/?>/gi, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstImageSrc(html: string): string | null {
  const m = /<img[^>]+src="([^"]+)"/i.exec(html);
  return m && isSafeImageSrc(m[1]) ? m[1] : null;
}
