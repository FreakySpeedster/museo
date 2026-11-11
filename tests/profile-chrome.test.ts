import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CompactIdentity } from "@/components/profile/CompactIdentity";
import { MOBILE_TOPBAR_HEIGHT_PX, STICKY_TOP_CLASS, isCompactIdentityShown, stickyObserverOptions } from "@/lib/profile-chrome";

describe("profile sticky chrome", () => {
  it("shows compact identity only after the header has left the viewport", () => {
    expect(isCompactIdentityShown(true)).toBe(false);
    expect(isCompactIdentityShown(false)).toBe(true);
  });

  it("insets the observer by the phone top bar only; desktop has no top header", () => {
    expect(MOBILE_TOPBAR_HEIGHT_PX).toBe(48);
    expect(STICKY_TOP_CLASS).toBe("top-12 md:top-0");
    expect(stickyObserverOptions(false)).toEqual({ threshold: 0, rootMargin: "-48px 0px 0px 0px" });
    expect(stickyObserverOptions(true)).toEqual({ threshold: 0, rootMargin: "-0px 0px 0px 0px" });
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
