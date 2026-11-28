import { describe, expect, it } from "vitest";
import {
  floor,
  lowBatch,
  nearest,
  neighbourTags,
  newLeads,
  QUERY,
  score,
  toLead,
  VENUE_QUERY,
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

  it("knows a preprint listed by its arXiv id", () => {
    const fresh = newLeads([{ doi: "10.48550/arxiv.2611.07947" }], [{ arxiv: "2611.07947" }], []);
    expect(fresh).toEqual([]);
  });

  it("needs an AI term and an IE term", () => {
    expect(QUERY).toMatch(/^\(.*"machine learning".*\) AND \(.*"life cycle assessment".*\)$/);
  });

  it("counts a bare AI mention only in the core venues", () => {
    expect(QUERY).not.toContain("artificial intelligence");
    expect(VENUE_QUERY).toContain('"artificial intelligence"');
    expect(VENUE_QUERY).not.toContain("AND");
  });

  it("names input-output analysis, not any input-output pair", () => {
    expect(QUERY).toContain('"input-output analysis"');
    expect(QUERY).not.toContain('"input-output"');
  });

  it("warns when new leads score below the open queue's median", () => {
    const leads = (...s: number[]) => s.map((v) => ({ score: v }));
    expect(lowBatch(leads(0.02, 0.03), leads(0.05, 0.06, 0.07))).toContain("Low batch");
    expect(lowBatch(leads(0.06, 0.08), leads(0.05, 0.06, 0.07))).toBeNull();
    expect(lowBatch([], leads(0.05))).toBeNull();
  });

  // unit vectors in 2-D: listed papers near the x axis, rejected ones near the y axis
  const at = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const listed = [0, 5, 10, 15].map((d, i) => ({
    key: `l${i}`,
    id: `lit-${i}`,
    vec: at(d),
    tags: { ie: i < 2 ? ["sem"] : ["lca"], ml: ["cv"] },
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
    expect(neighbourTags(nearest(at(0), listed, 3))).toEqual({ ie: ["sem"], ml: ["cv"] });
  });

  it("sets the floor so a typical listed paper clears it and an off-topic one does not", () => {
    const cut = floor(listed, rejected, 0);
    expect(score(at(8), listed, rejected).score).toBeGreaterThanOrEqual(cut);
    expect(score(at(85), listed, rejected).score).toBeLessThan(cut);
  });
});
