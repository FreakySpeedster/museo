import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CompactIdentity } from "@/components/profile/CompactIdentity";
import {
  APP_NAV_HEIGHT_PX,
  APP_NAV_TOP_CLASS,
  STICKY_OBSERVER_OPTIONS,
  STICKY_OBSERVER_ROOT_MARGIN,
  isCompactIdentityShown,
} from "@/lib/profile-chrome";

describe("profile sticky chrome", () => {
  it("shows compact identity only after the header has left the viewport", () => {
    expect(isCompactIdentityShown(true)).toBe(false);
    expect(isCompactIdentityShown(false)).toBe(true);
  });

  it("observes a root inset by the app navbar height so the bar can sit at top-16", () => {
    expect(APP_NAV_HEIGHT_PX).toBe(64);
    expect(APP_NAV_TOP_CLASS).toBe("top-16");
    expect(STICKY_OBSERVER_ROOT_MARGIN).toBe("-64px 0px 0px 0px");
    expect(STICKY_OBSERVER_OPTIONS).toEqual({ threshold: 0, rootMargin: "-64px 0px 0px 0px" });
  });

  it("renders only avatar, display name and @handle when visible", () => {
    const html = renderToStaticMarkup(
      createElement(CompactIdentity, {
        visible: true,
        displayName: "Ada Lovelace",
        username: "ada",
        avatarUrl: null,
      }),
    );
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain('data-visible="true"');
    expect(html).not.toContain("followers");
    expect(html).not.toContain("following");
  });

  it("collapses off the layout and stays inert when hidden", () => {
    const html = renderToStaticMarkup(
      createElement(CompactIdentity, {
        visible: false,
        displayName: "Ada Lovelace",
        username: "ada",
        avatarUrl: null,
      }),
    );
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain('data-visible="false"');
    expect(html).toContain("aria-hidden");
    expect(html).toContain("grid-cols-[0fr]");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain('tabindex="-1"');
  });
});
