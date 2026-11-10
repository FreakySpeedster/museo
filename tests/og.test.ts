import { describe, expect, it } from "vitest";
import { decodeHtml, parseMetadata } from "@/lib/net/og";

const BASE = "https://example.com/blog/post";

describe("parseMetadata", () => {
  it("prefers og:image, resolves relative urls, reads title/description/site", () => {
    const m = parseMetadata(
      `<html><head><title>Fallback</title>
       <meta property="og:title" content="  Hello   World ">
       <meta property="og:description" content="A great page">
       <meta property="og:site_name" content="Example">
       <meta property="og:image" content="/img/cover.png">
       <meta name="twitter:image" content="https://cdn.example.com/tw.png">
       <link rel="icon" href="/fav.png"></head></html>`,
      BASE,
    );
    expect(m).toMatchObject({
      title: "Hello World",
      description: "A great page",
      siteName: "Example",
      image: "https://example.com/img/cover.png",
      favicon: "https://example.com/fav.png",
    });
  });

  it("falls back to twitter:image, then <title> and meta description", () => {
    const m = parseMetadata(
      `<title>Plain title</title><meta name="description" content="desc"><meta name="twitter:image" content="//cdn.example.com/t.jpg">`,
      BASE,
    );
    expect(m.image).toBe("https://cdn.example.com/t.jpg");
    expect(m.title).toBe("Plain title");
    expect(m.description).toBe("desc");
    expect(m.siteName).toBe("example.com");
  });

  it("falls back to the first large <img>, skipping icons and tiny images", () => {
    const m = parseMetadata(
      `<body><img src="/logo.png" width="300"><img src="/tiny.jpg" width="20" height="20"><img src="/hero.jpg" width="800" height="400"></body>`,
      BASE,
    );
    expect(m.image).toBe("https://example.com/hero.jpg");
  });

  it("falls back to favicon (apple-touch-icon preferred, then /favicon.ico) when there is no image", () => {
    const a = parseMetadata(`<link rel="icon" href="/a.ico"><link rel="apple-touch-icon" href="/apple.png">`, BASE);
    expect(a.image).toBeNull();
    expect(a.favicon).toBe("https://example.com/apple.png");
    expect(parseMetadata("<p>hi</p>", BASE).favicon).toBe("https://example.com/favicon.ico");
  });

  it("ignores non-http image urls", () => {
    const m = parseMetadata(`<meta property="og:image" content="javascript:alert(1)"><meta name="twitter:image" content="data:image/png;base64,AAA">`, BASE);
    expect(m.image).toBeNull();
  });
});

describe("decodeHtml", () => {
  it("honours charset from the content-type header", () => {
    const buf = Buffer.from([0x63, 0x61, 0x66, 0xe9]); // "café" in latin1
    expect(decodeHtml(buf, "text/html; charset=iso-8859-1")).toBe("café");
  });
});
