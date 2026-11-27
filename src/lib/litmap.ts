// The literature map's layout (Fig. 2.1 on /literature/ and its Table 2.1),
// worked out at build time only: druidjs is a dev dependency and never reaches the browser.
// Entry vectors go to 2D by t-SNE, and the clusters are found on that 2D layout, so a cluster
// is a group the reader can see. No randomness reaches the output except through SEED, so the
// same vectors give the same map on every build.
import { KMeans, TSNE } from "@saehrimnir/druidjs";
import { tagLabel } from "../data/tags";
import { decodeVector, entryText } from "./semantic";
import { loadMapVectors, textKey } from "./vectors";

export const SEED = 4242;
/** Clusters with fewer papers than this are drawn as thin. */
export const THIN_CLUSTER = 5;
export const K = 9;
/** Plate width in SVG units; the height follows the layout's own shape. */
export const W = 760;
const PAD = 36;
const PAD_TOP = 48; // room for the top row of labels
const HULL_PAD = 14;
const LINE = 15; // label line height

// biome-ignore-start lint/suspicious/noBitwiseOperators: mulberry32 is bit arithmetic
/** Small seeded generator (mulberry32): same seed, same sequence. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// biome-ignore-end lint/suspicious/noBitwiseOperators: mulberry32

type Entry = {
  id: string;
  title: string;
  blurb: string;
  ie: string[];
  topic: string[];
  ml: string[];
  type: string[];
};

/** The one place the map's input vectors come from: one per entry, or undefined for an entry
 * left off the map. They embed each paper's own title and abstract (its summary when OpenAlex
 * has no abstract), written by `pnpm run embed`, not the curator's tags that then colour the
 * points. Swap this function to lay the map out from other inputs. */
export function mapVectors(entries: readonly Entry[]): (Float32Array | undefined)[] {
  const stored = loadMapVectors();
  return entries.map((e) => (stored[e.id] ? decodeVector(stored[e.id]) : undefined));
}

/** The vectors in 2D by t-SNE (cosine closeness, as unit vectors under euclidean distance),
 * centred, turned so the wider spread runs across, and scaled by one factor so the larger
 * spread fits [-1, 1]: both axes keep the same scale. */
export function project(vectors: ArrayLike<number>[], seed = SEED): [number, number][] {
  const n = vectors.length;
  if (n === 0) return [];
  // t-SNE needs a perplexity of at least 1, so (n - 1) / 3 >= 1: fewer papers sit on a line.
  if (n < 4) return vectors.map((_, i) => [n === 1 ? -1 : -1 + (2 * i) / (n - 1), 0]);
  const unit = vectors.map((v) => {
    const a = Array.from(v);
    const m = Math.hypot(...a) || 1;
    return a.map((x) => x / m);
  });
  const perplexity = Math.min(15, Math.floor((n - 1) / 3));
  const tsne = new TSNE(unit, { perplexity, epsilon: 10, d: 2, seed });
  const raw = (tsne.transform(500) as number[][]).map((r) => [r[0], r[1]]);
  const mx = raw.reduce((s, p) => s + p[0], 0) / n;
  const my = raw.reduce((s, p) => s + p[1], 0) / n;
  const c = raw.map(([x, y]) => [x - mx, y - my]);
  // Principal axis of the 2D layout, from its 2x2 covariance.
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of c) {
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const [cos, sin] = [Math.cos(-a), Math.sin(-a)];
  const turned = c.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
  // Fix each axis' sign so its largest-magnitude point sits positive.
  for (const d of [0, 1]) {
    const big = turned.reduce((m, p) => (Math.abs(p[d]) > Math.abs(m) ? p[d] : m), 0);
    if (big < 0) for (const p of turned) p[d] = -p[d];
  }
  const k = Math.max(...turned.flat().map(Math.abs)) || 1;
  return turned.map(([x, y]) => [x / k, y / k]);
}

/** Cluster index per 2D point: seeded k-means, numbered by first member so the numbering is
 * stable. */
export function cluster(xy: [number, number][], k = K, seed = SEED): number[] {
  if (xy.length === 0) return [];
  const km = new KMeans(xy, { K: Math.min(k, xy.length), seed });
  const label = km.get_cluster_list();
  const order = [...new Set(label)];
  return label.map((c) => order.indexOf(c));
}

type Pt = [number, number];

/** Convex hull, counter-clockwise on screen (monotone chain). */
export function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const h: Pt[] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  return [...half(pts), ...half([...pts].reverse())];
}

/** The hull of a disc of radius `pad` round each point, as an SVG path: a rounded outline
 * that also works for a cluster of one or two papers. */
export function paddedHull(
  points: Pt[],
  pad = HULL_PAD,
): { d: string; poly: Pt[]; top: number; bottom: number; cx: number } {
  const ring = points.flatMap(([x, y]) =>
    Array.from({ length: 16 }, (_, i): Pt => {
      const t = (i / 16) * 2 * Math.PI;
      return [Math.round(x + pad * Math.cos(t)), Math.round(y + pad * Math.sin(t))];
    }),
  );
  const h = hull(ring);
  const xs = h.map((p) => p[0]);
  return {
    d: `M${h.map((p) => p.join(" ")).join("L")}Z`,
    poly: h,
    top: Math.min(...h.map((p) => p[1])),
    bottom: Math.max(...h.map((p) => p[1])),
    cx: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
  };
}

type Tagged = { ie: string[]; topic: string[]; ml: string[] };

/** Whether p lies inside a convex polygon. */
function inside(poly: Pt[], [x, y]: Pt): boolean {
  if (poly.length < 3) return false;
  const side = (a: Pt, b: Pt) => Math.sign((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]));
  const signs = poly.map((a, i) => side(a, poly[(i + 1) % poly.length]));
  return signs.every((s) => s >= 0) || signs.every((s) => s <= 0);
}

/** IE field, topic and technique tags ranked by lift: a tag's share in the cluster over its
 * share in the whole list, so the name says what sets the cluster apart rather than what every
 * paper has. Tags on at least a third of the cluster rank first; below them come tags on at
 * least two papers, so a cluster whose strong tags are all taken still gets a name. A tag on a
 * single paper never names a cluster of more than one. Ties go to the commoner tag. */
export function liftRanking(members: Tagged[], all: Tagged[]): { label: string; lift: number }[] {
  const count = (list: Tagged[]) => {
    const n = new Map<string, number>();
    for (const e of list)
      for (const dim of ["ie", "topic", "ml"] as const)
        for (const t of new Set(e[dim])) n.set(`${dim}:${t}`, (n.get(`${dim}:${t}`) ?? 0) + 1);
    return n;
  };
  const inside = count(members);
  const overall = count(all);
  const floor = Math.min(members.length, 2);
  const strong = Math.max(floor, Math.ceil(members.length / 3));
  return [...inside]
    .filter(([, c]) => c >= floor)
    .map(([key, c]) => {
      const [dim, tag] = key.split(":") as ["ie" | "topic" | "ml", string];
      const lift = c / members.length / ((overall.get(key) ?? c) / all.length);
      return { label: tagLabel(dim, tag), c, lift, strong: c >= strong };
    })
    .sort(
      (a, b) =>
        Number(b.strong) - Number(a.strong) ||
        b.lift - a.lift ||
        b.c - a.c ||
        a.label.localeCompare(b.label, "en"),
    )
    .map(({ label, lift }) => ({ label, lift }));
}

export type MapCluster = {
  name: string;
  n: number;
  thin: boolean;
  /** Padded hull outline. */
  d: string;
  /** Label anchor: top centre of the hull. */
  lx: number;
  ly: number;
};

/** What the map and its table draw, in plate units. Points are [id, x, y, cluster]. */
export type LitMap = {
  w: number;
  h: number;
  points: [string, number, number, number][];
  clusters: MapCluster[];
};

/** Lay out the entries that have a vector. Entries without one are left out. */
export function layoutMap(entries: readonly Entry[], vectors = mapVectors(entries)): LitMap {
  const placed = entries.flatMap((e, i) => (vectors[i] ? [{ e, v: vectors[i] }] : []));
  if (placed.length === 0) return { w: W, h: 0, points: [], clusters: [] };
  const xy = project(placed.map((p) => p.v));
  const labels = cluster(xy);
  const [x0, x1] = [Math.min(...xy.map((p) => p[0])), Math.max(...xy.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...xy.map((p) => p[1])), Math.max(...xy.map((p) => p[1]))];
  const s = (W - 2 * PAD) / (x1 - x0 || 1);
  const h = Math.round((y1 - y0) * s + PAD + PAD_TOP);
  const pts: Pt[] = xy.map(([x, y]) => [
    Math.round(PAD + (x - x0) * s),
    Math.round(PAD_TOP + (y1 - y) * s),
  ]);

  const all = placed.map((p) => p.e);
  const ids = [...new Set(labels)];
  const groups = ids.map((c) =>
    placed.flatMap((p, i) => (labels[i] === c ? [{ e: p.e, xy: pts[i] }] : [])),
  );
  // Names go to the biggest clusters first, so a small cluster does not take a big one's name.
  const taken = new Set<string>();
  const names: string[] = [];
  for (const i of [...ids.keys()].sort((a, b) => groups[b].length - groups[a].length || a - b)) {
    const name = liftRanking(
      groups[i].map((m) => m.e),
      all,
    ).find((r) => !taken.has(r.label))?.label;
    names[i] = name ?? `Cluster ${ids[i] + 1}`;
    taken.add(names[i]);
  }
  const outlines = groups.map((g) => paddedHull(g.map((p) => p.xy)));
  const clusters: MapCluster[] = groups.map((g, i) => ({
    name: names[i],
    n: g.length,
    thin: g.length < THIN_CLUSTER,
    d: outlines[i].d,
    lx: 0,
    ly: 0,
  }));
  // Each label goes to the top centre of its hull. One that would cover a paper, an earlier
  // label or another cluster's shading tries the bottom centre, a line or two higher, and last
  // just inside its own hull, each also a third of its width to either side; it takes the place
  // that covers least, preferring that order. Labels stay on the plate.
  const width = labelWidth;
  const done: MapCluster[] = [];
  // Sitting on another cluster's shading would tie the label to the wrong cluster.
  const onOther = (i: number, x: number, y: number) =>
    outlines.filter(
      (o, j) =>
        j !== i &&
        [x - width(clusters[i]) / 2, x, x + width(clusters[i]) / 2].some((lx) =>
          inside(o.poly, [lx, y - 4]),
        ),
    ).length;
  const cost = (k: MapCluster, x: number, y: number) =>
    (y - 11 < 0 || y + 4 > h ? 100 : 0) +
    pts.filter(([px, py]) => Math.abs(px - x) < width(k) / 2 + 6 && py > y - 17 && py < y + 10)
      .length +
    10 *
      done.filter(
        (o) => Math.abs(o.ly - y) < LINE && Math.abs(o.lx - x) < (width(o) + width(k)) / 2 + 4,
      ).length;
  for (const i of [...ids.keys()].sort((a, b) => outlines[a].top - outlines[b].top)) {
    const k = clusters[i];
    const o = outlines[i];
    const ys = [
      o.top - 5,
      o.bottom + 13,
      o.top - 5 - LINE,
      o.top - 5 - 2 * LINE,
      o.top + 17,
      o.bottom - 6,
    ];
    const tries = ys.flatMap((y) =>
      [0, -1 / 3, 1 / 3].map((f) => {
        const x = o.cx + f * width(k);
        return [Math.round(Math.min(Math.max(x, width(k) / 2 + 2), W - width(k) / 2 - 2)), y];
      }),
    );
    const scored = tries.map(([x, y], n) => ({
      x,
      y,
      c: cost(k, x, y) + 3 * onOther(i, x, y) + n * 0.01,
    }));
    const best = scored.reduce((m, t) => (t.c < m.c ? t : m));
    k.lx = best.x;
    k.ly = best.y;
    done.push(k);
  }
  return {
    w: W,
    h,
    points: placed.map((p, i) => [p.e.id, pts[i][0], pts[i][1], labels[i]]),
    clusters,
  };
}

/** A cluster label's width in plate units: about 7 a character at the label's bold 12px. */
export function labelWidth(k: { name: string; n: number }): number {
  return (k.name.length + String(k.n).length + 2) * 7;
}

let memo: { key: string; map: LitMap } | undefined;
/** layoutMap() once per build: the map and its table share it. */
export function litMap(entries: readonly Entry[]): LitMap {
  const key = entries.map((e) => textKey(entryText(e))).join();
  if (memo?.key !== key) memo = { key, map: layoutMap(entries) };
  return memo.map;
}
