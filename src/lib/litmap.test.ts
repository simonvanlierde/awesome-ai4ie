import { describe, expect, it } from "vitest";
import { cluster, project, rng } from "./litmap";

// Three blobs in 16 dimensions, so the projection and the clusters have something to find.
function blobs() {
  const next = rng(7);
  return Array.from({ length: 30 }, (_, i) =>
    Array.from({ length: 16 }, (__, j) => (j % 3 === i % 3 ? 1 : 0) + (next() - 0.5) * 0.2),
  );
}

describe("literature map", () => {
  const vecs = blobs();

  it("gives the same coordinates for the same vectors", () => {
    expect(project(vecs)).toEqual(project(blobs()));
    expect(cluster(vecs, 3)).toEqual(cluster(blobs(), 3));
  });

  it("places every vector once, inside [-1, 1]", () => {
    const xy = project(vecs);
    expect(xy).toHaveLength(vecs.length);
    for (const p of xy.flat()) expect(Math.abs(p)).toBeLessThanOrEqual(1);
    expect(cluster(vecs, 3)).toHaveLength(vecs.length);
  });

  it("gives two uncorrelated axes", () => {
    const xy = project(vecs);
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    const [mx, my] = [mean(xy.map((p) => p[0])), mean(xy.map((p) => p[1]))];
    const cov = mean(xy.map((p) => (p[0] - mx) * (p[1] - my)));
    expect(Math.abs(cov)).toBeLessThan(0.01);
  });

  it("keeps each blob together", () => {
    const labels = cluster(vecs, 3);
    for (let i = 3; i < vecs.length; i++) expect(labels[i]).toBe(labels[i - 3]);
    expect(new Set(labels).size).toBe(3);
  });

  it("handles no vectors", () => {
    expect(project([])).toEqual([]);
    expect(cluster([], 3)).toEqual([]);
  });
});
