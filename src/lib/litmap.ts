// The literature map (src/components/LiteratureMap.astro): entry vectors projected to 2D by
// PCA and grouped by k-means. No randomness reaches the output except through SEED, so the
// same vectors give the same layout on every build.

export const SEED = 4242;
/** Clusters with fewer papers than this are drawn as thin. */
export const THIN_CLUSTER = 5;

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

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

const unitRows = (vs: ArrayLike<number>[]) =>
  vs.map((v) => {
    const n = Math.sqrt(dot(v, v)) || 1;
    return Float64Array.from(v, (x) => x / n);
  });

/** The first two principal components of the unit-length vectors, as [x, y] per vector,
 * scaled together so the larger spread fits [-1, 1] (the map component then stretches each axis itself). Power iteration with deflation; each
 * axis' sign is fixed so its largest-magnitude point sits positive. */
export function project(vectors: ArrayLike<number>[], seed = SEED): [number, number][] {
  const rows = unitRows(vectors);
  const n = rows.length;
  if (n === 0) return [];
  const d = rows[0].length;
  const mean = new Float64Array(d);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / n;
  const X = rows.map((r) => r.map((x, j) => x - mean[j]));
  const next = rng(seed);
  const coords: Float64Array[] = [];
  for (let c = 0; c < 2; c++) {
    let v = Float64Array.from({ length: d }, () => next() - 0.5);
    for (let it = 0; it < 100; it++) {
      const w = new Float64Array(d);
      for (const r of X) {
        const s = dot(r, v);
        for (let j = 0; j < d; j++) w[j] += s * r[j];
      }
      const norm = Math.sqrt(dot(w, w)) || 1;
      v = w.map((x) => x / norm);
    }
    const scores = Float64Array.from(X, (r) => dot(r, v));
    const big = scores.reduce((m, s) => (Math.abs(s) > Math.abs(m) ? s : m), 0);
    if (big < 0) {
      v = v.map((x) => -x);
      for (let i = 0; i < n; i++) scores[i] = -scores[i];
    }
    coords.push(scores);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) X[i][j] -= scores[i] * v[j]; // deflate
  }
  const k = Math.max(...coords.flatMap((c) => Array.from(c, Math.abs))) || 1;
  return Array.from({ length: n }, (_, i) => [coords[0][i] / k, coords[1][i] / k]);
}

/** Cluster index per vector: k-means on the unit vectors (cosine), seeded k-means++ start,
 * clusters numbered by their first member so the numbering is stable. */
export function cluster(vectors: ArrayLike<number>[], k: number, seed = SEED): number[] {
  const rows = unitRows(vectors);
  const n = rows.length;
  k = Math.min(k, n);
  if (k === 0) return [];
  const next = rng(seed);
  const centres = [Float64Array.from(rows[Math.floor(next() * n)])];
  while (centres.length < k) {
    const d2 = rows.map((r) => Math.min(...centres.map((c) => 1 - dot(r, c))) ** 2);
    let pick = next() * d2.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < n - 1 && pick > d2[i]) pick -= d2[i++];
    centres.push(Float64Array.from(rows[i]));
  }
  let label = new Array<number>(n).fill(-1);
  for (let it = 0; it < 50; it++) {
    const now = rows.map((r) => {
      let best = 0;
      for (let c = 1; c < k; c++) if (dot(r, centres[c]) > dot(r, centres[best])) best = c;
      return best;
    });
    const prev = label;
    if (now.every((c, i) => c === prev[i])) break;
    label = now;
    const current = now;
    for (let c = 0; c < k; c++) {
      const members = rows.filter((_, i) => current[i] === c);
      if (!members.length) continue;
      const sum = new Float64Array(rows[0].length);
      for (const m of members) for (let j = 0; j < sum.length; j++) sum[j] += m[j];
      const norm = Math.sqrt(dot(sum, sum)) || 1;
      centres[c] = sum.map((x) => x / norm);
    }
  }
  const order = [...new Set(label)];
  return label.map((c) => order.indexOf(c));
}
