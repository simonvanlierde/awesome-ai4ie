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

/** The colour modes after the default IE field: AI technique and OpenAlex topic. */
export const MODES = ["ie", "ml", "topic"] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = {
  ie: "IE field",
  ml: "AI technique",
  topic: "OpenAlex topic",
};
export const MODE_NONE: Record<Mode, string> = {
  ie: "No IE field",
  ml: "No technique",
  topic: "No topic data",
};
/** Colour classes 0-5 are the six biggest categories, OTHER the rest, NONE no value. */
export const TOP = 6;
export const OTHER = 6;
export const NONE_CAT = 7;

export type Legend = { cat: number; label: string; n: number }[];
/** A category mode as the page ships it: its legend, and one digit per point in the points'
 * order (the class number above). */
export type ModeColours = { legend: Legend; cats: string };

/** Puts each value in a category: the TOP commonest (ties by label) take 0-5 in that order,
 * the rest share OTHER, and an undefined value gets NONE_CAT. */
export function categorise(
  values: readonly (string | undefined)[],
  label: (v: string) => string,
  none: string,
): ModeColours {
  const n = new Map<string, number>();
  for (const v of values) if (v) n.set(v, (n.get(v) ?? 0) + 1);
  const top = [...n]
    .sort((a, b) => b[1] - a[1] || label(a[0]).localeCompare(label(b[0]), "en"))
    .slice(0, TOP)
    .map(([v]) => v);
  const cat = (v: string | undefined) =>
    v ? (top.includes(v) ? top.indexOf(v) : OTHER) : NONE_CAT;
  const count = (c: number) => values.filter((v) => cat(v) === c).length;
  const legend: Legend = [
    ...top.map((v, c) => ({ cat: c, label: label(v), n: n.get(v) ?? 0 })),
    { cat: OTHER, label: "Other", n: count(OTHER) },
    { cat: NONE_CAT, label: none, n: count(NONE_CAT) },
  ].filter((l) => l.n > 0);
  return { legend, cats: values.map(cat).join("") };
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

/** Mark in a category mode: shapes belong to IE fields alone, so every value is a disc and a
 * missing one the hollow dot. */
export function catPath(cat: number, x: number, y: number): string {
  return markPath(cat === NONE_CAT ? undefined : "lca", x, y);
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

/** A window onto the plate, in plate units, drawn as the SVG's viewBox. */
export type View = { x: number; y: number; w: number; h: number };
/** Closest zoom, as a multiple of the whole plate. */
export const ZOOM_MAX = 8;

/** The whole plate in a frame of aspect `a` (width over height), centred: zoom 1. A frame
 * wider than the plate leaves room to either side, a taller one above and below. */
export function baseView(w: number, h: number, a: number): View {
  return a > w / h
    ? { x: (w - h * a) / 2, y: 0, w: h * a, h }
    : { x: 0, y: (h - w / a) / 2, w, h: w / a };
}

export const zoomOf = (v: View, base: View) => base.w / v.w;

/** `v` with its zoom held to 1 to ZOOM_MAX and its window kept inside `base`, about its centre. */
export function clampView(v: View, base: View): View {
  const k = Math.min(Math.max(v.w / base.w, 1 / ZOOM_MAX), 1);
  const [w, h] = [base.w * k, base.h * k];
  const place = (c: number, size: number, lo: number, span: number) =>
    Math.min(Math.max(c - size / 2, lo), lo + span - size);
  return {
    x: place(v.x + v.w / 2, w, base.x, base.w),
    y: place(v.y + v.h / 2, h, base.y, base.h),
    w,
    h,
  };
}

/** Zoom by factor `f` about plate point (px, py), which stays put on screen unless the clamp
 * to the plate moves it. */
export function zoomAt(v: View, f: number, px: number, py: number, base: View): View {
  const z = zoomOf(v, base);
  const g = Math.min(Math.max(z * f, 1), ZOOM_MAX) / z;
  return clampView(
    { x: px - (px - v.x) / g, y: py - (py - v.y) / g, w: v.w / g, h: v.h / g },
    base,
  );
}

/** Move the window by (dx, dy) plate units, kept inside the plate. */
export function panBy(v: View, dx: number, dy: number, base: View): View {
  return clampView({ ...v, x: v.x + dx, y: v.y + dy }, base);
}

/** The closest view, in the frame's aspect, that holds the box (x0, y0)-(x1, y1) with `pad`
 * round it. */
export function fitView(
  box: { x0: number; y0: number; x1: number; y1: number },
  base: View,
  pad = 0,
): View {
  const a = base.w / base.h;
  const w = Math.max(box.x1 - box.x0 + 2 * pad, (box.y1 - box.y0 + 2 * pad) * a);
  const h = w / a;
  return clampView(
    { x: (box.x0 + box.x1) / 2 - w / 2, y: (box.y0 + box.y1) / 2 - h / 2, w, h },
    base,
  );
}

/** The least pan that brings (px, py) at least `margin` inside the window. */
export function keepInView(v: View, px: number, py: number, margin: number, base: View): View {
  const mx = Math.min(margin, v.w / 2);
  const my = Math.min(margin, v.h / 2);
  const x = Math.min(Math.max(v.x, px + mx - v.w), px - mx);
  const y = Math.min(Math.max(v.y, py + my - v.h), py - my);
  return clampView({ ...v, x, y }, base);
}

/** The plate point under screen point (cx, cy), in a frame at `rect` that shows `v`. */
export function toPlate(
  v: View,
  rect: { left: number; top: number; width: number; height: number },
  cx: number,
  cy: number,
): [number, number] {
  return [v.x + ((cx - rect.left) * v.w) / rect.width, v.y + ((cy - rect.top) * v.h) / rect.height];
}

export type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Greedy label placement: each label, in order, is kept when it stays inside `bounds` and
 * covers neither a kept label nor an obstacle. `own` says which obstacle a label may cover
 * (its own mark). */
export function placeLabels<T extends Box, O extends Box>(
  labels: readonly T[],
  bounds: { w: number; h: number },
  obstacles: readonly O[] = [],
  own: (label: T, obstacle: O) => boolean = () => false,
): T[] {
  const kept: T[] = [];
  for (const l of labels) {
    if (l.x < 0 || l.y < 0 || l.x + l.w > bounds.w || l.y + l.h > bounds.h) continue;
    if (kept.some((k) => overlaps(k, l))) continue;
    if (obstacles.some((o) => !own(l, o) && overlaps(o, l))) continue;
    kept.push(l);
  }
  return kept;
}
