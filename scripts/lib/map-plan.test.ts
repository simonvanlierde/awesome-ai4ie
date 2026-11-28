import { describe, expect, it } from "vitest";
import { textKey } from "../../src/lib/vectors.ts";
import { mapPlan, mapTodo } from "./map-plan.mjs";

const paper = { id: "p", title: "T", blurb: "Summary.", doi: "10.1/P" };
const meta = { p: { abstract: "hash" } };
const empty = { keys: {}, sources: {}, vectors: {} };
const works = new Map([["10.1/p", { abstract_inverted_index: { Abstract: [0] } }]]);

describe("map vector plan", () => {
  it("keeps a cached paper's key and asks OpenAlex for nothing", () => {
    const src = textKey("T\n\nhash");
    const cache = { keys: { p: "k1" }, sources: { p: src }, vectors: { k1: "v" } };
    expect(mapTodo([paper], meta, cache)).toEqual({ todo: [], dois: [] });
    expect(mapPlan([paper], meta, cache, null)).toEqual({
      keys: { p: "k1" },
      sources: { p: src },
      texts: [],
    });
  });

  it("embeds the abstract when it arrives", () => {
    expect(mapTodo([paper], meta, empty).dois).toEqual(["10.1/p"]);
    const plan = mapPlan([paper], meta, empty, works);
    expect(plan.texts).toEqual(["T\n\nAbstract"]);
    expect(plan.sources.p).toBe(textKey("T\n\nhash"));
  });

  it("falls back to the summary when the fetch failed, and retries next run", () => {
    const plan = mapPlan([paper], meta, empty, null);
    expect(plan.texts).toEqual(["T\n\nSummary."]);
    expect(plan.keys.p).toBe(textKey("T\n\nSummary."));
    expect(plan.sources.p).toBeNull();
  });

  it("places a paper without a DOI by its summary, for good", () => {
    const noDoi = { ...paper, doi: undefined };
    expect(mapTodo([noDoi], {}, empty).dois).toEqual([]);
    const plan = mapPlan([noDoi], {}, empty, new Map());
    expect(plan.texts).toEqual(["T\n\nSummary."]);
    expect(plan.sources.p).toBe(textKey("T\n\nSummary."));
  });

  it("does not ask OpenAlex for a paper it knows has no abstract", () => {
    const none = { p: { abstract: null } };
    expect(mapTodo([paper], none, empty).dois).toEqual([]);
    expect(mapPlan([paper], none, empty, new Map()).sources.p).toBe(textKey("T\n\nSummary."));
  });
});
