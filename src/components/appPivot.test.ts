import { describe, expect, it } from "vitest";
import { groupBy, toGrid } from "./appPivot";

const apps = [
  { id: "a", ie: ["circular"], ml: ["cv"] },
  { id: "b", ie: ["circular", "lca"], ml: ["llm"] },
];

describe("groupBy", () => {
  it("groups by IE dimension with multi-tag entries in every group", () => {
    const g = groupBy(apps, "ie");
    expect(g.get("circular")?.map((e) => e.id)).toEqual(["a", "b"]);
    expect(g.get("lca")?.map((e) => e.id)).toEqual(["b"]);
  });
  it("groups by ML dimension", () => {
    const g = groupBy(apps, "ml");
    expect(g.get("cv")?.map((e) => e.id)).toEqual(["a"]);
    expect(g.get("llm")?.map((e) => e.id)).toEqual(["b"]);
  });
  // Groups must not fall back to data order: `circular` is introduced first here but
  // `lca` comes first in vocabulary.yaml, and the views follow the latter.
  it("emits groups in vocabulary order, not first-appearance order", () => {
    expect([...groupBy(apps, "ie").keys()]).toEqual(["lca", "circular"]);
    expect([...groupBy(apps, "ml").keys()]).toEqual(["llm", "cv"]);
  });
});

describe("toGrid", () => {
  it("only includes rows/cols that have entries, in vocabulary order, cell key is ie|ml", () => {
    const grid = toGrid(apps);
    expect(grid.rows).toEqual(["lca", "circular"]);
    expect(grid.cols).toEqual(["llm", "cv"]);
    expect(grid.cells.get("circular|cv")?.length).toBe(1);
    expect(grid.cells.get("lca|llm")?.length).toBe(1);
    expect(grid.cells.get("lca|cv")).toBeUndefined();
  });
  it("adds entries that share a tag pair to the same cell", () => {
    const grid = toGrid([
      { id: "a", ie: ["circular"], ml: ["cv"] },
      { id: "b", ie: ["circular"], ml: ["cv"] },
    ]);
    expect(grid.cells.get("circular|cv")?.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
