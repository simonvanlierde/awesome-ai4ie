import { describe, expect, it } from "vitest";
import { entryText, isPhrase, MAX_HITS, rank } from "./semantic";

describe("rank", () => {
  it("orders by cosine and drops entries below the cut-off", () => {
    const q = [1, 0];
    const vs = [
      [0.3, 0.95], // 0.3: below the cut-off
      [0.6, 0.8],
      [1, 0],
    ];
    expect(rank(q, vs)).toEqual([2, 1]);
  });

  it("returns nothing when no entry is close, and at most MAX_HITS", () => {
    expect(rank([1, 0], [[0, 1]])).toEqual([]);
    expect(
      rank(
        [1, 0],
        Array.from({ length: 9 }, () => [1, 0]),
      ),
    ).toHaveLength(MAX_HITS);
  });
});

describe("isPhrase", () => {
  it("leaves one- and two-word keyword queries to Pagefind", () => {
    expect(isPhrase("sam")).toBe(false);
    expect(isPhrase("  waste sorting ")).toBe(false);
    expect(isPhrase("papers on waste sorting")).toBe(true);
  });
});

describe("entryText", () => {
  it("joins title, blurb and every tag dimension", () => {
    expect(entryText({ title: "T", blurb: "B.", ie: ["lca"], type: ["review"] })).toBe(
      "T. B. Tags: lca, review",
    );
  });
});
