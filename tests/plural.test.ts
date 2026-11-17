import { describe, expect, it } from "vitest";
import { count, plural } from "@/lib/plural";

describe("plural", () => {
  it("uses the singular only for one", () => {
    expect(plural("follower", 1)).toBe("follower");
    expect(plural("follower", 0)).toBe("followers");
    expect(plural("follower", 2)).toBe("followers");
  });
  it("handles irregular and explicit plurals", () => {
    expect(plural("reply", 3)).toBe("replies");
    expect(plural("child", 2, "children")).toBe("children");
  });
  it("formats the count with separators", () => {
    expect(count(1, "view")).toBe("1 view");
    expect(count(1200, "view")).toBe("1,200 views");
  });
});
