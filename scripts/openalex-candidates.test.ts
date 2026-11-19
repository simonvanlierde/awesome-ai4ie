import { describe, expect, it } from "vitest";
import { abstractText, newLeads, QUERY, suggestTags, toLead } from "./openalex-candidates.mjs";

const work = {
  doi: "https://doi.org/10.1000/ABC",
  title: "Random forests for material flow analysis of steel",
  publication_year: 2026,
  primary_location: { source: { display_name: "J. Ind. Ecol." } },
  best_oa_location: { pdf_url: "https://example.org/a.pdf" },
  abstract_inverted_index: { Bayesian: [0], stocks: [1] },
};

describe("openalex-candidates", () => {
  it("rebuilds an abstract from its inverted index", () => {
    expect(abstractText({ world: [1], hello: [0] })).toBe("hello world");
    expect(abstractText(null)).toBe("");
  });

  it("suggests tags from the title and abstract", () => {
    expect(suggestTags("LLMs for life cycle assessment of water")).toEqual({
      ie: ["lca"],
      topic: ["water"],
      ml: ["llm"],
    });
  });

  it("turns a work into a lead with a bare, lower-case DOI", () => {
    const lead = toLead(work, "2026-11-19");
    expect(lead).toMatchObject({
      doi: "10.1000/abc",
      year: 2026,
      venue: "J. Ind. Ecol.",
      status: "new",
    });
    expect(lead?.hints).toEqual({
      ie: ["mfa"],
      topic: ["metals"],
      ml: ["tabular-ml", "uncertainty"],
    });
    expect(toLead({ ...work, doi: null }, "2026-11-19")).toBeNull();
  });

  it("skips DOIs already listed or already a lead, and duplicates within a run", () => {
    const leads = ["10.1/a", "10.1/b", "10.1/c", "10.1/c"].map((doi) => ({ doi }));
    const fresh = newLeads(leads, [{ doi: "10.1/A" }], [{ doi: "10.1/b" }]);
    expect(fresh.map((l: { doi: string }) => l.doi)).toEqual(["10.1/c"]);
  });

  it("needs an AI term and an IE term", () => {
    expect(QUERY).toMatch(/^\(.*"machine learning".*\) AND \(.*"life cycle assessment".*\)$/);
  });
});
