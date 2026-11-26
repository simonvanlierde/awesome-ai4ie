import { describe, expect, it } from "vitest";
import { decodePoints, encodePoints, first, markPath, nearest, step } from "./litMapNav";

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

  it("starts at the top left, and finds the point under the pointer", () => {
    expect(first(P)?.id).toBe("left"); // ties with "up" go to the first listed
    expect(first([])).toBeNull();
    expect(nearest(P, 68, 50, 5)?.id).toBe("right");
    expect(nearest(P, 60, 60, 5)).toBeNull();
  });
});
