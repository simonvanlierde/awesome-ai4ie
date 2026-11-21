import { describe, expect, it } from "vitest";
import { missingTechniques, sankeyLayout, topicLenses } from "./sankey";

const entries = [
  { ie: ["lca"], ml: ["llm", "tabular-ml"] },
  { ie: ["lca"], ml: ["llm"] },
  { ie: ["circular"], ml: ["cv"] },
  { ml: ["llm"] }, // no IE field: a landmark paper, not part of the flow
];

describe("sankeyLayout", () => {
  const { ieNodes, mlNodes, bands, total } = sankeyLayout(entries, 100, 10);

  it("counts one pairing per field-technique pair on an entry", () => {
    expect(total).toBe(4);
    expect(bands.map((b) => [b.ie, b.ml, b.count])).toEqual([
      ["lca", "llm", 2],
      ["lca", "tabular-ml", 1],
      ["circular", "cv", 1],
    ]);
  });

  it("stacks nodes in vocabulary order on one shared scale", () => {
    expect(ieNodes.map((n) => n.tag)).toEqual(["lca", "circular"]);
    expect(mlNodes.map((n) => n.tag)).toEqual(["llm", "cv", "tabular-ml"]);
    // The ML column has more nodes, so its gaps set the scale: (100 - 2*10) / 4.
    expect(mlNodes[0].h).toBe(40);
    expect(ieNodes[0].h).toBe(60);
    const last = mlNodes.at(-1);
    expect(last && last.y + last.h).toBe(100);
  });

  it("keeps each band's height and packs it inside both of its nodes", () => {
    for (const b of bands) {
      const from = ieNodes.find((n) => n.tag === b.ie);
      const to = mlNodes.find((n) => n.tag === b.ml);
      expect(b.y0).toBeGreaterThanOrEqual(from?.y ?? -1);
      expect(b.y0 + b.h).toBeLessThanOrEqual((from?.y ?? 0) + (from?.h ?? 0) + 1e-9);
      expect(b.y1).toBeGreaterThanOrEqual(to?.y ?? -1);
      expect(b.y1 + b.h).toBeLessThanOrEqual((to?.y ?? 0) + (to?.h ?? 0) + 1e-9);
    }
  });

  it("labels each node with its distinct papers, not its pairings", () => {
    // lca carries 3 pairings (height) from 2 papers; llm 2 pairings from 2 papers.
    expect(ieNodes.map((n) => [n.tag, n.count, n.papers])).toEqual([
      ["lca", 3, 2],
      ["circular", 1, 1],
    ]);
    expect(mlNodes.find((n) => n.tag === "llm")?.papers).toBe(2);
    expect(sankeyLayout(entries, 100, 10).papers).toBe(3);
  });

  it("counts a tag listed twice on one entry once", () => {
    const { bands: twice } = sankeyLayout([{ ie: ["lca", "lca"], ml: ["cv"] }], 100, 10);
    expect(twice.map((b) => b.count)).toEqual([1]);
  });

  it("returns an empty figure for no tagged entries", () => {
    expect(sankeyLayout([], 100, 10)).toMatchObject({ bands: [], total: 0 });
  });
});

describe("missingTechniques", () => {
  it("lists vocabulary techniques with no node, in vocabulary order", () => {
    const { mlNodes } = sankeyLayout(entries, 100, 10);
    const missing = missingTechniques(mlNodes);
    expect(missing).not.toContain("llm");
    expect(missing).toContain("depth");
    expect(missing.indexOf("segmentation")).toBeLessThan(missing.indexOf("depth"));
  });
});

describe("topicLenses", () => {
  const tagged = [
    { ie: ["lca", "sem"], ml: ["cv"], topic: ["buildings", "energy"] },
    { ie: ["lca"], ml: ["llm", "cv"], topic: ["buildings"] },
    { ie: ["circular"], ml: ["cv"], topic: ["electronics"] },
    // Outside the flow (missing ie or ml): must not count toward any lens.
    { ml: ["llm"], topic: ["water", "buildings"] },
    { ie: ["lca"], topic: ["food"] },
  ];

  it("returns topics in vocabulary order, omitting those with no papers in the flow", () => {
    const lenses = topicLenses(tagged);
    expect(lenses.map((l) => l.tag)).toEqual(["buildings", "electronics", "energy"]);
  });

  it("counts distinct papers, fields, techniques and deduplicated band keys", () => {
    const lenses = topicLenses(tagged);
    const buildings = lenses.find((l) => l.tag === "buildings");
    expect(buildings).toEqual({
      tag: "buildings",
      papers: 2,
      fields: 2,
      techniques: 2,
      bands: ["lca|cv", "sem|cv", "lca|llm"],
    });
  });

  it("deduplicates repeated topic, field and technique tags on one entry", () => {
    const lenses = topicLenses([
      { ie: ["lca", "lca"], ml: ["cv", "cv"], topic: ["buildings", "buildings"] },
    ]);
    expect(lenses).toEqual([
      { tag: "buildings", papers: 1, fields: 1, techniques: 1, bands: ["lca|cv"] },
    ]);
  });
});
