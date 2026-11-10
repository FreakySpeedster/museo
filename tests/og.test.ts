import { describe, expect, it } from "vitest";
import { rankMeasured } from "@/lib/link-preview";
import { cleanImageUrl, decodeHtml, oembedCandidates, parseMetadata, urlCandidates } from "@/lib/net/og";

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

describe("parseMetadata thumbnail candidates", () => {
  const urls = (m: ReturnType<typeof parseMetadata>) => m.imageCandidates.map((c) => c.url);

  it("ranks og:image (multi-line tags) > JSON-LD product images > large body images, over logos", () => {
    const m = parseMetadata(
      `<head><meta
         property="og:image"
         content="http://shop.example.com/cdn/a.jpg?v=1"
       >
       <script type="application/ld+json">{"@type":"Product","image":["//shop.example.com/cdn/b.jpg",{"url":"https://shop.example.com/cdn/c.jpg"}]}</script></head>
       <body><img src="/logo.svg" width="300"><img src="/cdn/d.jpg" width="900" height="900"></body>`,
      "https://shop.example.com/products/x",
    );
    expect(m.image).toBe("https://shop.example.com/cdn/a.jpg?v=1");
    expect(urls(m).slice(0, 4)).toEqual([
      "https://shop.example.com/cdn/a.jpg?v=1",
      "https://shop.example.com/cdn/b.jpg",
      "https://shop.example.com/cdn/c.jpg",
      "https://shop.example.com/cdn/d.jpg",
    ]);
    expect(m.imageCandidates[0].source).toBe("og");
    expect(urls(m).indexOf("https://shop.example.com/logo.svg")).toBeGreaterThan(3);
  });

  it("uses JSON-LD @graph when the page has no og:image", () => {
    const m = parseMetadata(`<script type="application/ld+json">{"@graph":[{"@type":"Product","image":"https://c.example.com/p.jpg"}]}</script>`, BASE);
    expect(m.image).toBe("https://c.example.com/p.jpg");
    expect(m.imageCandidates[0].source).toBe("jsonld");
  });

  it("reads og:image:secure_url / :url variants, decodes entities and resolves relative + protocol-relative urls", () => {
    const m = parseMetadata(`<meta property="og:image:secure_url" content="//cdn.example.com/a.jpg?x=1&amp;y=2"><meta property="og:image" content="/rel/b.jpg">`, "https://ex.com/p/1");
    expect(urls(m)).toContain("https://cdn.example.com/a.jpg?x=1&y=2");
    expect(urls(m)).toContain("https://ex.com/rel/b.jpg");
    expect(m.image).toBe("https://cdn.example.com/a.jpg?x=1&y=2");
  });

  it("falls back to twitter:image(:src), microdata, image_src and preload hints", () => {
    const m = parseMetadata(
      `<meta name="twitter:image:src" content="https://x.com/tw.jpg"><meta itemprop="image" content="https://x.com/micro.jpg">
       <link rel="image_src" href="https://x.com/linked.jpg"><link rel="preload" as="image" href="https://x.com/pre.jpg">`,
      BASE,
    );
    expect(urls(m)).toEqual(["https://x.com/tw.jpg", "https://x.com/micro.jpg", "https://x.com/linked.jpg", "https://x.com/pre.jpg"]);
  });

  it("picks the largest srcset / lazy-loaded gallery image and skips tiny or icon images", () => {
    const m = parseMetadata(
      `<img class="product-gallery" data-src="/lazy.jpg" width="800" height="800">
       <img src="/pixel.gif" width="1" height="1"><img src="/x/sprite.png" width="64" height="64">
       <img srcset="/s/a-400.jpg 400w, /s/a-1200.jpg 1200w, /s/a-800.jpg 800w" width="600" height="600">`,
      BASE,
    );
    expect(urls(m)).toEqual(expect.arrayContaining(["https://example.com/lazy.jpg", "https://example.com/s/a-1200.jpg"]));
    expect(urls(m)).not.toContain("https://example.com/pixel.gif");
    expect(urls(m)).not.toContain("https://example.com/x/sprite.png");
  });

  it("Amazon: prefers the hi-res landingImage map over the generated og banner", () => {
    const html = `<meta property="og:image" content="https://m.media-amazon.com/images/I/817Hae.jpg_BO30,255,255,255_UF750,750_SR1910,1000,0,C_ZJP">
      <img id="landingImage" src="https://m.media-amazon.com/images/I/41x._SY445_SX342_.jpg"
        data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/817Hae._SY679_.jpg&quot;:[679,679],&quot;https://m.media-amazon.com/images/I/817Hae._SL1500_.jpg&quot;:[1500,1500]}">`;
    const m = parseMetadata(html, "https://www.amazon.in/dp/1");
    expect(m.image).toBe("https://m.media-amazon.com/images/I/817Hae.jpg");
    expect(m.imageCandidates[0].source).toBe("site");
  });

  it("exposes oEmbed / AMP / canonical discovery links", () => {
    const m = parseMetadata(
      `<link rel="alternate" type="application/json+oembed" href="/oembed?url=a&amp;format=json"><link rel="amphtml" href="https://ex.com/amp/p"><link rel="canonical" href="https://ex.com/p">`,
      "https://ex.com/p?utm=1",
    );
    expect(m.oembedUrl).toBe("https://ex.com/oembed?url=a&format=json");
    expect(m.ampUrl).toBe("https://ex.com/amp/p");
    expect(m.canonicalUrl).toBe("https://ex.com/p");
  });
});

describe("cleanImageUrl", () => {
  it("fills Shopify {width} placeholders and upgrades tiny Shopify renditions", () => {
    expect(cleanImageUrl("//cdn.shopify.com/s/files/1/p_{width}x.jpg?v=3", BASE)).toBe("https://cdn.shopify.com/s/files/1/p.jpg?v=3&width=1200");
    expect(cleanImageUrl("https://cdn.shopify.com/s/files/1/product_100x100.jpg?v=3", BASE)).toBe("https://cdn.shopify.com/s/files/1/product.jpg?v=3&width=1200");
    expect(cleanImageUrl("https://other.com/files/a.jpg?v=3&width=300", BASE)).toContain("width=300"); // non-Shopify path untouched
    expect(cleanImageUrl("https://shop.com/cdn/shop/files/a.jpg?width=300", BASE)).toBe("https://shop.com/cdn/shop/files/a.jpg?width=1200");
  });

  it("strips Amazon size modifiers and upgrades Flipkart / Myntra renditions", () => {
    expect(cleanImageUrl("https://m.media-amazon.com/images/I/41abc._SX38_SY50_CR,0,0,38,50_.jpg", BASE)).toBe("https://m.media-amazon.com/images/I/41abc.jpg");
    expect(cleanImageUrl("https://rukminim2.flixcart.com/image/128/128/xif0q/mobile/a.jpeg?q=70", BASE)).toBe("https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/a.jpeg?q=70");
    expect(cleanImageUrl("https://assets.myntassets.com/h_200,w_200,c_fill,g_auto/h_1440,q_75,w_1080/v1/a.jpg", BASE)).toBe("https://assets.myntassets.com/h_1440,q_75,w_1080/v1/a.jpg");
  });

  it("rejects data:, javascript: and empty values", () => {
    expect(cleanImageUrl("data:image/png;base64,AAAA", BASE)).toBeNull();
    expect(cleanImageUrl("javascript:alert(1)", BASE)).toBeNull();
    expect(cleanImageUrl("  ", BASE)).toBeNull();
  });
});

describe("urlCandidates / oembedCandidates / rankMeasured", () => {
  it("derives YouTube thumbnails (maxres first) from any watch / short url", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ"]) {
      expect(urlCandidates(u)[0].url).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
    }
    expect(urlCandidates("https://example.com/")).toEqual([]);
  });

  it("reads thumbnail_url / photo url from oEmbed json", () => {
    expect(oembedCandidates({ type: "video", thumbnail_url: "https://i.example.com/t.jpg", thumbnail_width: 480 }, BASE)[0]).toMatchObject({ url: "https://i.example.com/t.jpg", width: 480, source: "oembed" });
    expect(oembedCandidates({ type: "photo", url: "https://i.example.com/p.jpg" }, BASE)[0].url).toBe("https://i.example.com/p.jpg");
    expect(oembedCandidates(null, BASE)).toEqual([]);
  });

  it("penalises tiny, svg and extreme-aspect images but rewards large ones", () => {
    const c = { url: "https://a/b.jpg", source: "og" as const, score: 100 };
    expect(rankMeasured(c, 1200, 1200)).toBeGreaterThan(rankMeasured(c, 150, 150));
    expect(rankMeasured(c, 80, 80)).toBeLessThan(rankMeasured({ ...c, score: 30 }, 1200, 1200));
    expect(rankMeasured(c, 2000, 300)).toBeLessThan(rankMeasured(c, 1200, 900));
    expect(rankMeasured(c, 800, 800, "svg")).toBeLessThan(rankMeasured(c, 800, 800, "jpeg"));
  });
});
