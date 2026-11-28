import { describe, expect, it } from "vitest";
import {
  cluster,
  hull,
  labelWidth,
  layoutMap,
  liftRanking,
  litMap,
  nameBox,
  namePxPerUnit,
  paddedHull,
  project,
  rng,
  W,
} from "./litmap";

// Three blobs in 16 dimensions, so the projection and the clusters have something to find.
function blobs(n = 30) {
  const next = rng(7);
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: 16 }, (__, j) => (j % 3 === i % 3 ? 1 : 0) + (next() - 0.5) * 0.2),
  );
}

const entry = (i: number, tags: Partial<Record<"ie" | "topic" | "ml", string[]>> = {}) => ({
  id: `p${i}`,
  title: `Paper ${i}`,
  blurb: "",
  ie: [],
  topic: [],
  ml: [],
  type: [],
  ...tags,
});

describe("project", () => {
  const vecs = blobs();

  it("gives the same layout for the same vectors and seed", () => {
    expect(project(vecs, 1)).toEqual(project(blobs(), 1));
  });

  it("places every vector once, with one scale for both axes", () => {
    const xy = project(vecs);
    expect(xy).toHaveLength(vecs.length);
    const flat = xy.flat().map(Math.abs);
    for (const v of flat) expect(v).toBeLessThanOrEqual(1);
    expect(Math.max(...flat)).toBeCloseTo(1);
  });

  it("turns the wider spread across", () => {
    const xy = project(vecs);
    const spread = (d: 0 | 1) =>
      Math.max(...xy.map((p) => p[d])) - Math.min(...xy.map((p) => p[d]));
    expect(spread(0)).toBeGreaterThanOrEqual(spread(1) * 0.9);
  });

  it("handles no vectors and too few for t-SNE", () => {
    expect(project([])).toEqual([]);
    expect(project([[1, 0]])).toHaveLength(1);
    // Three vectors would give t-SNE a perplexity of 0, and NaN positions.
    const three = project(blobs(3));
    expect(three.flat().every(Number.isFinite)).toBe(true);
    expect(new Set(three.map((p) => p.join())).size).toBe(3);
  });

  it("lays an elongated cloud across, its farthest points on the positive side", () => {
    // 40 points along one direction in 16 dimensions, with a little noise.
    const next = rng(3);
    const line = Array.from({ length: 40 }, (_, i) =>
      Array.from(
        { length: 16 },
        (__, j) => (j === 0 ? 1 : 0) + (j === 1 ? i / 8 : 0) + (next() - 0.5) * 0.05,
      ),
    );
    const xy = project(line);
    const spread = (d: 0 | 1) =>
      Math.max(...xy.map((p) => p[d])) - Math.min(...xy.map((p) => p[d]));
    expect(spread(0)).toBeGreaterThan(2 * spread(1));
    for (const d of [0, 1] as const) {
      const big = xy.reduce((m, p) => (Math.abs(p[d]) > Math.abs(m) ? p[d] : m), 0);
      expect(big).toBeGreaterThan(0);
    }
  });
});

describe("cluster", () => {
  it("clusters the 2D layout, keeping each blob together, the same way every time", () => {
    const xy = project(blobs());
    const labels = cluster(xy, 3);
    expect(labels).toEqual(cluster(project(blobs()), 3));
    for (let i = 3; i < labels.length; i++) expect(labels[i]).toBe(labels[i - 3]);
    expect(new Set(labels).size).toBe(3);
    expect(labels[0]).toBe(0); // numbered by first member
  });

  it("handles no points", () => {
    expect(cluster([], 3)).toEqual([]);
  });
});

describe("hulls", () => {
  it("keeps the corners and drops the inside points", () => {
    const h = hull([
      [0, 0],
      [10, 0],
      [5, 5],
      [10, 10],
      [0, 10],
    ]);
    expect(h).toHaveLength(4);
    expect(h).not.toContainEqual([5, 5]);
  });

  it("draws a padded outline round a single point, with its top and centre", () => {
    const o = paddedHull([[50, 50]], 10);
    expect(o.d).toMatch(/^M.*Z$/);
    expect(o.top).toBe(40);
    expect(o.cx).toBe(50);
  });
});

describe("liftRanking", () => {
  // 20 papers: every one tagged "llm"; four tagged "water", three of them in the cluster.
  const all = Array.from({ length: 20 }, (_, i) =>
    entry(i, { ml: ["llm"], topic: i < 4 ? ["water"] : [] }),
  );
  const members = [all[0], all[1], all[2], all[10], all[11], all[12]];

  it("names a cluster for what sets it apart, not what every paper has", () => {
    const r = liftRanking(members, all);
    expect(r[0].label).toBe("Water");
    expect(r[0].lift).toBeCloseTo(3 / 6 / (4 / 20));
    expect(r.find((x) => x.label !== "Water")?.lift).toBeCloseTo(1);
  });

  it("never names a cluster for a tag on one of its papers", () => {
    const one = [entry(0, { topic: ["water"] }), entry(1), entry(2)];
    expect(liftRanking(one, [...one, entry(3)])).toEqual([]);
  });

  it("ranks a tag on a third of the cluster above a rarer, weaker one", () => {
    const m = [
      ...Array.from({ length: 6 }, (_, i) => entry(i, { ml: i < 2 ? ["depth"] : [] })),
    ].map((e, i) => ({ ...e, topic: i < 3 ? ["water"] : [] }));
    const rest = Array.from({ length: 30 }, (_, i) => entry(100 + i, { topic: ["water"] }));
    // depth: 2 of 6, lift 6; water: 3 of 6 but common, lift ~0.6. Both on a third: lift decides.
    expect(liftRanking(m, [...m, ...rest])[0].label).toBe("Depth & 3D geometry");
  });

  it("ranks a tag on a third of the cluster above a weaker one with a higher lift", () => {
    // water: 3 of 9 (a third) but on every paper overall; depth: 2 of 9, found nowhere else.
    const m = Array.from({ length: 9 }, (_, i) =>
      entry(i, { topic: i < 3 ? ["water"] : [], ml: i < 2 ? ["depth"] : [] }),
    );
    const rest = Array.from({ length: 20 }, (_, i) => entry(100 + i, { topic: ["water"] }));
    expect(liftRanking(m, [...m, ...rest]).map((r) => r.label)).toEqual([
      "Water",
      "Depth & 3D geometry",
    ]);
  });

  it("breaks a tie in lift by the commoner tag, then by name", () => {
    // Every tag below is found only in the cluster, so all share one lift.
    const m = Array.from({ length: 6 }, (_, i) =>
      entry(i, { topic: i < 4 ? ["water"] : i < 6 ? ["metals"] : [], ml: i >= 4 ? ["llm"] : [] }),
    );
    expect(liftRanking(m, [...m, entry(9)]).map((r) => r.label)).toEqual([
      "Water",
      "LLMs & agents",
      "Metals & critical materials",
    ]);
  });
});

describe("layoutMap", () => {
  const vecs = blobs(24);
  const entries = vecs.map((_, i) => entry(i, { ml: [["llm", "cv", "depth"][i % 3]] }));
  const withGap = [...vecs.slice(0, 23), undefined].map((v) =>
    v ? Float32Array.from(v) : undefined,
  );
  const map = layoutMap(entries, withGap);

  it("places every entry with a vector once, and leaves the rest out", () => {
    const ids = map.points.map((p) => p[0]);
    expect(ids).toHaveLength(23);
    expect(new Set(ids).size).toBe(23);
    expect(ids).not.toContain("p23");
  });

  it("keeps points and labels on the plate", () => {
    for (const [, x, y] of map.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(map.h);
    }
    for (const k of map.clusters) {
      expect(k.ly).toBeGreaterThan(0);
      expect(k.lx).toBeGreaterThan(0);
      expect(k.lx).toBeLessThan(W);
    }
  });

  it("gives each cluster a unique name, its size and its outline", () => {
    const names = map.clusters.map((k) => k.name);
    expect(new Set(names).size).toBe(names.length);
    const sizes = map.clusters.map((_, c) => map.points.filter((p) => p[3] === c).length);
    expect(map.clusters.map((k) => k.n)).toEqual(sizes);
    for (const k of map.clusters) {
      expect(k.thin).toBe(k.n < 5);
      expect(k.d).toMatch(/^M/);
    }
  });

  it("keeps each label on the plate, clear of the other labels and of every paper", () => {
    // A bold 12px label measures about 7 plate units a character.
    const half = (k: { name: string; n: number }) =>
      ((k.name.length + String(k.n).length + 2) * 7) / 2;
    expect(labelWidth({ name: "Water", n: 12 })).toBeGreaterThanOrEqual(
      2 * half({ name: "Water", n: 12 }),
    );
    const boxes = map.clusters.map((k) => ({
      x0: k.lx - half(k),
      x1: k.lx + half(k),
      y0: k.ly - 11,
      y1: k.ly + 4,
    }));
    for (const b of boxes) {
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(W);
      expect(b.y0).toBeGreaterThanOrEqual(0);
      expect(b.y1).toBeLessThanOrEqual(map.h);
      for (const [id, x, y] of map.points)
        expect(x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1, id).toBe(false);
    }
    boxes.forEach((a, i) => {
      for (const b of boxes.slice(i + 1))
        expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
    });
  });

  it("keeps the cluster-name buttons from touching at the smallest desktop scale", () => {
    // Each is 24px tall, so meeting WCAG 2.5.8 (24 by 24px) leaves only that no two overlap.
    const s = namePxPerUnit(map.h);
    const boxes = map.clusters.map((k) => nameBox(k, s));
    for (const b of boxes) expect((b.y1 - b.y0) * s).toBeCloseTo(24);
    boxes.forEach((a, i) => {
      for (const b of boxes.slice(i + 1))
        expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
    });
  });

  it("gives a name two clusters share to the bigger one", () => {
    // One tag on every paper: the biggest cluster is named for it, the rest get numbers.
    const same = layoutMap(
      vecs.map((_, i) => entry(i, { topic: ["water"] })),
      vecs.map((v) => Float32Array.from(v)),
    );
    const sizes = same.clusters.map((k) => k.n);
    expect(new Set(sizes).size).toBeGreaterThan(1);
    const water = same.clusters.find((k) => k.name === "Water");
    expect(water?.n).toBe(Math.max(...sizes));
    expect(same.clusters.filter((k) => k.name.startsWith("Cluster"))).toHaveLength(
      sizes.length - 1,
    );
  });

  it("is the same on every build", () => {
    expect(layoutMap(entries, withGap)).toEqual(map);
  });

  it("is empty with no vectors", () => {
    expect(
      layoutMap(
        entries,
        entries.map(() => undefined),
      ).points,
    ).toEqual([]);
  });
});

describe("litMap", () => {
  it("lays the map out once per list, and again for a new list", () => {
    const a = [entry(1), entry(2)];
    const b = [entry(1), entry(3)];
    expect(litMap(a)).toBe(litMap(a));
    expect(litMap(b)).not.toBe(litMap(a));
  });
});
