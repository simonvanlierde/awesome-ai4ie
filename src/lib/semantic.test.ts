import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  decodeVector,
  entryText,
  isPhrase,
  MAX_HITS,
  MIN_SCORE,
  queryText,
  rank,
  unit,
} from "./semantic";

// A unit vector whose cosine with [1, 0] is `s`.
const at = (s: number) => [s, Math.sqrt(1 - s * s)];

describe("rank", () => {
  it("keeps entries at or above MIN_SCORE, best first", () => {
    const vs = [at(MIN_SCORE - 0.01), at(MIN_SCORE + 0.01), [1, 0]];
    expect(rank([1, 0], vs)).toEqual([2, 1]);
  });

  it("returns at most MAX_HITS", () => {
    expect(
      rank(
        [1, 0],
        Array.from({ length: 9 }, () => [1, 0]),
      ),
    ).toHaveLength(MAX_HITS);
  });
});

describe("queryText", () => {
  it("puts the task instruction before the question", () => {
    const t = queryText("waste sorting");
    expect(t.startsWith("Instruct: ")).toBe(true);
    expect(t.endsWith("\nQuery: waste sorting")).toBe(true);
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
