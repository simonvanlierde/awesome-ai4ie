import { describe, expect, it } from "vitest";
import type { ResourceEntry } from "../data/schemas";
import { pickResources, textParts } from "./resources";

const base = { url: "https://example.org", blurb: "Something worth reading.", checked: "2026-11" };
const ENTRIES: ResourceEntry[] = [
  { ...base, id: "a", title: "a", kind: "tool", group: "local", ie: [], topic: [], ml: ["llm"] },
  { ...base, id: "b", title: "B", kind: "dataset", ie: ["lca"], topic: ["buildings"], ml: [] },
  { ...base, id: "c", title: "C", kind: "dataset", ie: [], topic: [], ml: ["tabular-ml"] },
];
const ids = (f: Parameters<typeof pickResources>[1]) =>
  pickResources([...ENTRIES].reverse(), f).map((e) => e.id);

describe("pickResources", () => {
  it("filters by kind, group and tag, sorted by title whatever the case", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(ids({ kind: "dataset" })).toEqual(["b", "c"]);
    expect(ids({ group: "local" })).toEqual(["a"]);
    expect(ids({ ml: "llm" })).toEqual(["a"]);
    expect(ids({ topic: "buildings" })).toEqual(["b"]);
    expect(ids({ kind: "dataset", ie: "lca" })).toEqual(["b"]);
  });
  it("reads ie any and none as with and without an IE tag", () => {
    expect(ids({ kind: "dataset", ie: "any" })).toEqual(["b"]);
    expect(ids({ kind: "dataset", ie: "none" })).toEqual(["c"]);
  });
});

describe("textParts", () => {
  it("splits Markdown links and code from plain text", () => {
    expect(textParts("See [the map](/applications-map/) or call `load_dataset()`.")).toEqual([
      { text: "See " },
      { text: "the map", href: "/applications-map/" },
      { text: " or call " },
      { text: "load_dataset()", code: true },
      { text: "." },
    ]);
  });
  it("keeps text without markup whole", () => {
    expect(textParts("Plain (with brackets).")).toEqual([{ text: "Plain (with brackets)." }]);
  });
});
