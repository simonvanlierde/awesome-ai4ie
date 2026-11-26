// Browser-side helpers for the literature map: the compact point list the page ships, the
// marks, and which point a pointer or an arrow key lands on. The layout itself is worked out
// at build time in src/lib/litmap.ts.

export type MapPoint = { id: string; x: number; y: number; c: number };

/** Points as one string ("id x y c;..."): far smaller in an island's props than an array,
 * which Astro serialises value by value. */
export function encodePoints(
  points: readonly (readonly [string, number, number, number])[],
): string {
  return points.map((p) => p.join(" ")).join(";");
}

export function decodePoints(s: string): MapPoint[] {
  return s
    ? s.split(";").map((row) => {
        const [id, x, y, c] = row.split(" ");
        return { id, x: Number(x), y: Number(y), c: Number(c) };
      })
    : [];
}

// One shape per IE field, so colour is not the only cue. Absolute start, relative after it, so
// CSS can scale a mark about its own centre (transform-box: fill-box) on a small screen.
const SHAPES: Record<string, (x: number, y: number) => string> = {
  lca: (x, y) => `M${x - 5} ${y}a5 5 0 1 0 10 0a5 5 0 1 0-10 0`,
  circular: (x, y) => `M${x - 4.5} ${y - 4.5}h9v9h-9z`,
  sem: (x, y) => `M${x} ${y - 6.5}l6.5 6.5l-6.5 6.5l-6.5-6.5z`,
  eeio: (x, y) => `M${x} ${y - 6}l6 10.5h-12z`,
  symbiosis: (x, y) => `M${x - 2} ${y - 6}h4v4h4v4h-4v4h-4v-4h-4v-4h4z`,
};
/** No IE field (a method or landmark paper): a small hollow dot. */
const NONE = (x: number, y: number) => `M${x - 3} ${y}a3 3 0 1 0 6 0a3 3 0 1 0-6 0`;

export function markPath(field: string | undefined, x: number, y: number): string {
  return (field ? (SHAPES[field] ?? NONE) : NONE)(x, y);
}

/** The point closest to (x, y) within `reach`, or null. */
export function nearest(
  points: readonly MapPoint[],
  x: number,
  y: number,
  reach: number,
): MapPoint | null {
  let best: MapPoint | null = null;
  let bd = reach;
  for (const p of points) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bd) [best, bd] = [p, d];
  }
  return best;
}

const DIRS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

export const isArrow = (key: string) => key in DIRS;

/** The point an arrow key moves to from `from`: the nearest one within 60 degrees of that
 * direction, a sideways step counting double, so Right goes to the next point along rather
 * than one far above it. Null at the edge. */
export function step(points: readonly MapPoint[], from: MapPoint, key: string): MapPoint | null {
  const [dx, dy] = DIRS[key] ?? [0, 0];
  let best: MapPoint | null = null;
  let bs = Number.POSITIVE_INFINITY;
  for (const p of points) {
    if (p === from) continue;
    const along = (p.x - from.x) * dx + (p.y - from.y) * dy;
    const side = Math.abs((p.x - from.x) * dy - (p.y - from.y) * dx);
    if (along <= 0 || side > along * Math.sqrt(3)) continue;
    const score = along + 2 * side;
    if (score < bs) [best, bs] = [p, score];
  }
  return best;
}

/** Where the keyboard starts: the top-left point, the start of reading order. */
export function first(points: readonly MapPoint[]): MapPoint | null {
  return points.reduce<MapPoint | null>((a, p) => (!a || p.x + p.y < a.x + a.y ? p : a), null);
}
