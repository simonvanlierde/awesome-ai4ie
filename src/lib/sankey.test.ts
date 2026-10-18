import { describe, expect, it } from "vitest";
import { sankeyLayout } from "./sankey";

const entries = [
  { ie: ["lca"], ml: ["llm", "tabular-ml"] },
  { ie: ["lca"], ml: ["llm"] },
  { ie: ["eol"], ml: ["cv"] },
  { ml: ["llm"] }, // no IE field: a landmark paper, not part of the flow
];

describe("sankeyLayout", () => {
  const { ieNodes, mlNodes, bands, total } = sankeyLayout(entries, 100, 10);

  it("counts one pairing per field-technique pair on an entry", () => {
    expect(total).toBe(4);
    expect(bands.map((b) => [b.ie, b.ml, b.count])).toEqual([
      ["lca", "llm", 2],
      ["lca", "tabular-ml", 1],
      ["eol", "cv", 1],
    ]);
  });

  it("stacks nodes in vocabulary order on one shared scale", () => {
    expect(ieNodes.map((n) => n.tag)).toEqual(["lca", "eol"]);
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
      ["eol", 1, 1],
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
