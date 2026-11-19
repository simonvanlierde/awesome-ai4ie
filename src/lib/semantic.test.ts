import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  decodeVector,
  entryText,
  isPhrase,
  MAX_HITS,
  rank,
  SOFT_SCORE,
  STRONG_SCORE,
  stems,
  unit,
} from "./semantic";

const none = [new Set<string>()];
// A unit vector whose cosine with [1, 0] is `s`.
const at = (s: number) => [s, Math.sqrt(1 - s * s)];

describe("rank", () => {
  it("shows strong matches on meaning alone, best first", () => {
    const q = [1, 0];
    const vs = [at(SOFT_SCORE - 0.1), at(STRONG_SCORE + 0.01), [1, 0]];
    expect(rank(q, vs, new Set(), [new Set(), new Set(), new Set()])).toEqual([2, 1]);
  });

  it("shows a weaker match only when it shares a content word with the query", () => {
    const weak = [at((SOFT_SCORE + STRONG_SCORE) / 2)];
    expect(rank([1, 0], weak, stems("hallucinated citations"), none)).toEqual([]);
    expect(
      rank([1, 0], weak, stems("hallucinated citations"), [stems("citation hallucination")]),
    ).toEqual([0]);
  });

  it("returns at most MAX_HITS", () => {
    const vs = Array.from({ length: 9 }, () => [1, 0]);
    expect(
      rank(
        [1, 0],
        vs,
        new Set(),
        Array.from({ length: 9 }, () => new Set()),
      ),
    ).toHaveLength(MAX_HITS);
  });
});

describe("stems", () => {
  it("keeps content words, cut to five letters, and drops question words", () => {
    expect([...stems("Which papers use reinforcement learning for logistics?")]).toEqual([
      "reinf",
      "logis",
    ]);
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

describe("search-eval.yaml", () => {
  it("expects only ids that exist in literature.yaml", () => {
    const ids = new Set(
      parse(readFileSync("src/data/literature.yaml", "utf8")).map((e: { id: string }) => e.id),
    );
    const evalSet: { q: string; expect: string[] }[] = parse(
      readFileSync("src/data/search-eval.yaml", "utf8"),
    );
    expect(evalSet.flatMap((q) => q.expect).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("decodeVector", () => {
  it("reverses the build's base64 float32 encoding", async () => {
    const { encodeVector } = await import("./vectors");
    const v = [0.5, -0.25, 0.125];
    expect(decodeVector(encodeVector(v))).toEqual(v);
  });
});

describe("unit", () => {
  it("scales a vector to length 1 and leaves a zero vector alone", () => {
    expect(unit([3, 4])).toEqual([0.6, 0.8]);
    expect(unit([0, 0])).toEqual([0, 0]);
  });
});
