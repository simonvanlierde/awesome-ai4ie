import { describe, expect, it } from "vitest";
import {
  abstractText,
  floor,
  nearest,
  neighbourTags,
  newLeads,
  QUERY,
  score,
  toLead,
} from "./openalex-candidates.mjs";

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

  it("turns a work into a lead with a bare, lower-case DOI", () => {
    const lead = toLead(work, "2026-11-19");
    expect(lead).toMatchObject({
      doi: "10.1000/abc",
      year: 2026,
      venue: "J. Ind. Ecol.",
      status: "new",
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

  // unit vectors in 2-D: listed papers near the x axis, rejected ones near the y axis
  const at = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const listed = [0, 5, 10, 15].map((d, i) => ({
    key: `l${i}`,
    id: `lit-${i}`,
    vec: at(d),
    tags: { ie: i < 2 ? ["mfa"] : ["lca"], ml: ["cv"] },
  }));
  const rejected = [80, 85, 90].map((d, i) => ({ key: `r${i}`, vec: at(d) }));

  it("finds the nearest references, leaving a paper itself out", () => {
    expect(nearest(at(1), listed, 2).map((n: { id: string }) => n.id)).toEqual(["lit-0", "lit-1"]);
    expect(nearest(listed[0].vec, listed, 1, "l0")[0].id).toBe("lit-1");
  });

  it("scores a lead near listed papers above one near rejected leads", () => {
    expect(score(at(7), listed, rejected).score).toBeGreaterThan(
      score(at(70), listed, rejected).score,
    );
  });

  it("hints only the tags that two of the nearest papers share", () => {
    expect(neighbourTags(nearest(at(0), listed, 3))).toEqual({ ie: ["mfa"], ml: ["cv"] });
  });

  it("sets the floor so a typical listed paper clears it and an off-topic one does not", () => {
    const cut = floor(listed, rejected, 0);
    expect(score(at(8), listed, rejected).score).toBeGreaterThanOrEqual(cut);
    expect(score(at(85), listed, rejected).score).toBeLessThan(cut);
  });
});
