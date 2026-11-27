import { describe, expect, it } from "vitest";
import {
  baseView,
  categorise,
  catPath,
  clampView,
  decodePoints,
  encodePoints,
  first,
  fitView,
  keepInView,
  markPath,
  nearest,
  panBy,
  placeLabels,
  step,
  toPlate,
  ZOOM_MAX,
  zoomAt,
  zoomOf,
} from "./litMapNav";

// A plus sign round the middle point, and one far off to the upper right.
const P = decodePoints("mid 50 50 0;right 70 52 0;left 30 50 0;up 50 30 1;down 52 70 1;far 90 5 2");
const at = (id: string) => P.find((p) => p.id === id) ?? P[0];

describe("map points", () => {
  it("round-trip through the compact string", () => {
    const rows: [string, number, number, number][] = [
      ["a-2024", 1, 2, 0],
      ["b", 30, 40, 3],
    ];
    expect(decodePoints(encodePoints(rows))).toEqual([
      { id: "a-2024", x: 1, y: 2, c: 0 },
      { id: "b", x: 30, y: 40, c: 3 },
    ]);
    expect(decodePoints("")).toEqual([]);
  });

  it("draws one shape per field, centred on the point, and a dot for none", () => {
    expect(markPath("circular", 10, 10)).toBe("M5.5 5.5h9v9h-9z");
    expect(markPath(undefined, 10, 10)).toBe(markPath("unknown", 10, 10));
    expect(markPath(undefined, 10, 10)).toMatch(/^M7 10a3 3/);
  });
});

describe("map navigation", () => {
  it("moves to the nearest point in the arrow's direction", () => {
    expect(step(P, at("mid"), "ArrowRight")?.id).toBe("right");
    expect(step(P, at("mid"), "ArrowLeft")?.id).toBe("left");
    expect(step(P, at("mid"), "ArrowUp")?.id).toBe("up");
    expect(step(P, at("mid"), "ArrowDown")?.id).toBe("down");
  });

  it("does not jump sideways, and stops at the edge", () => {
    expect(step(P, at("right"), "ArrowRight")?.id).toBeUndefined(); // "far" is mostly up
    expect(step(P, at("left"), "ArrowLeft")).toBeNull();
    expect(step(P, at("up"), "ArrowRight")?.id).toBe("right");
  });

  it("counts a sideways step double, so Right prefers the next point along", () => {
    const o = { id: "o", x: 0, y: 0, c: 0 };
    // "off" is nearer (10.8 against 15) but 4 units off the line: 10 + 2 x 4 = 18 > 15.
    const pts = [o, { id: "off", x: 10, y: 4, c: 0 }, { id: "along", x: 15, y: 0, c: 0 }];
    expect(step(pts, o, "ArrowRight")?.id).toBe("along");
  });

  it("starts at the top left, and finds the point under the pointer", () => {
    expect(first(P)?.id).toBe("left"); // ties with "up" go to the first listed
    expect(first([])).toBeNull();
    expect(nearest(P, 68, 50, 5)?.id).toBe("right");
    expect(nearest(P, 60, 60, 5)).toBeNull();
  });
});

describe("categorise", () => {
  const id = (v: string) => v.toUpperCase();
  it("gives the six commonest values a class each, the rest one, and none its own", () => {
    const values = [..."aaaabbbcccdddeeefffgghh", undefined];
    const { legend, cats } = categorise(values, id, "None");
    // g and h tie on 2 papers and fall to "Other"; ties among the top go by label.
    expect(cats).toBe("00001112223334445556666" + "7");
    expect(legend.map((l) => [l.cat, l.label, l.n])).toEqual([
      [0, "A", 4],
      [1, "B", 3],
      [2, "C", 3],
      [3, "D", 3],
      [4, "E", 3],
      [5, "F", 3],
      [6, "Other", 4],
      [7, "None", 1],
    ]);
  });
  it("leaves out the Other and None entries when nothing falls there", () => {
    const { legend } = categorise(["x", "y", "x"], id, "None");
    expect(legend.map((l) => l.label)).toEqual(["X", "Y"]);
  });
  it("draws a disc in a colour mode and the hollow dot for none", () => {
    expect(catPath(0, 10, 10)).toBe(markPath("lca", 10, 10));
    expect(catPath(7, 10, 10)).toBe(markPath(undefined, 10, 10));
  });
});

describe("map zoom", () => {
  // A 200 x 100 plate in a frame of the same shape, and in a square one.
  const base = baseView(200, 100, 2);
  const r = (v: { x: number; y: number; w: number; h: number }) =>
    [v.x, v.y, v.w, v.h].map((n) => Math.round(n * 100) / 100);

  it("centres the plate in a frame of another shape", () => {
    expect(r(base)).toEqual([0, 0, 200, 100]);
    expect(r(baseView(200, 100, 4))).toEqual([-100, 0, 400, 100]);
    expect(r(baseView(200, 100, 1))).toEqual([0, -50, 200, 200]);
  });

  it("zooms about the pointer, which stays put", () => {
    const v = zoomAt(base, 2, 50, 50, base);
    expect(r(v)).toEqual([25, 25, 100, 50]);
    expect(zoomOf(v, base)).toBe(2);
    // The plate point under the pointer before and after is the same.
    const rect = { left: 0, top: 0, width: 400, height: 200 };
    expect(toPlate(v, rect, 100, 100)).toEqual(toPlate(base, rect, 100, 100));
  });

  it("holds zoom between 1x and the maximum, and the window on the plate", () => {
    expect(r(zoomAt(base, 0.5, 50, 50, base))).toEqual([0, 0, 200, 100]);
    expect(zoomOf(zoomAt(base, 100, 50, 50, base), base)).toBe(ZOOM_MAX);
    const v = zoomAt(base, 2, 0, 0, base);
    expect(r(panBy(v, -500, -500, base))).toEqual([0, 0, 100, 50]);
    expect(r(panBy(v, 500, 500, base))).toEqual([100, 50, 100, 50]);
    expect(r(clampView({ x: 50, y: 50, w: 1000, h: 500 }, base))).toEqual([0, 0, 200, 100]);
  });

  it("fits a box with padding, in the frame's shape", () => {
    expect(r(fitView({ x0: 20, y0: 20, x1: 40, y1: 30 }, base, 5))).toEqual([10, 15, 40, 20]);
    // A box too small for the closest zoom is centred at the maximum.
    expect(zoomOf(fitView({ x0: 100, y0: 50, x1: 100, y1: 50 }, base), base)).toBe(ZOOM_MAX);
  });

  it("pans the least to keep a point inside the window", () => {
    const v = { x: 50, y: 25, w: 100, h: 50 };
    expect(r(keepInView(v, 100, 50, 10, base))).toEqual([50, 25, 100, 50]);
    expect(r(keepInView(v, 160, 50, 10, base))).toEqual([70, 25, 100, 50]);
    expect(r(keepInView(v, 100, 10, 10, base))).toEqual([50, 0, 100, 50]);
  });

  it("maps a screen point to the plate", () => {
    const v = { x: 10, y: 20, w: 100, h: 50 };
    expect(toPlate(v, { left: 100, top: 50, width: 200, height: 100 }, 200, 100)).toEqual([60, 45]);
  });
});

describe("title labels", () => {
  const box = (id: string, x: number, y: number, w = 40) => ({ id, x, y, w, h: 10 });
  it("keeps labels in order that collide with no kept label, mark or edge", () => {
    const labels = [
      box("a", 0, 0),
      box("b", 30, 5),
      box("c", 0, 20),
      box("d", 90, 0),
      box("e", 0, 40),
    ];
    const marks = [
      { id: "e", x: 5, y: 42, w: 4, h: 4 },
      { id: "x", x: 10, y: 22, w: 4, h: 4 },
    ];
    const kept = placeLabels(labels, { w: 100, h: 100 }, marks, (l, m) => l.id === m.id);
    expect(kept.map((l) => l.id)).toEqual(["a", "e"]);
  });
});
