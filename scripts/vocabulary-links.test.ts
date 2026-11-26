import { describe, expect, it } from "vitest";
import { links, wikidataLabel } from "./vocabulary-links.mjs";

describe("wikidataLabel", () => {
  it("reads the English label, or the language-neutral one", () => {
    expect(wikidataLabel("Q1", { id: "Q1", labels: { en: { value: "universe" } } })).toBe(
      "universe",
    );
    expect(wikidataLabel("Q1", { id: "Q1", labels: { mul: { value: "Q-thing" } } })).toBe(
      "Q-thing",
    );
  });

  it("is null for a missing item and for one merged into another", () => {
    expect(wikidataLabel("Q9", { id: "Q9", missing: "" })).toBeNull();
    // Each redirect sign on its own: the target's id, and the redirects field.
    expect(wikidataLabel("Q9", { id: "Q10", labels: { en: { value: "x" } } })).toBeNull();
    expect(
      wikidataLabel("Q9", { id: "Q9", redirects: { from: "Q9", to: "Q10" }, labels: {} }),
    ).toBeNull();
    expect(wikidataLabel("Q9", undefined)).toBeNull();
  });

  it("is an empty string for a live item with no English label", () => {
    expect(wikidataLabel("Q9", { id: "Q9", labels: {} })).toBe("");
  });
});

describe("links", () => {
  it("lists every match, under each of the five properties, with its concept", () => {
    const rows = links([
      {
        id: "lca",
        prefLabel: "Life cycle assessment",
        exactMatch: ["http://www.wikidata.org/entity/Q581950"],
        closeMatch: ["https://openalex.org/T1"],
        broadMatch: ["https://openalex.org/T10435"],
        narrowMatch: ["http://www.wikidata.org/entity/Q2"],
        relatedMatch: ["http://www.wikidata.org/entity/Q3"],
      },
      { id: "water", prefLabel: "Water" },
    ]);
    expect(rows.map((r) => [r.id, r.rel])).toEqual([
      ["lca", "exactMatch"],
      ["lca", "closeMatch"],
      ["lca", "broadMatch"],
      ["lca", "narrowMatch"],
      ["lca", "relatedMatch"],
    ]);
  });
});
