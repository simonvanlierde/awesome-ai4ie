import { expect, test } from "vitest";
import { DEMO_DOWNLOAD, fillTokens, footprint, footprintTokens } from "./footprint.mjs";

const rows = [
  { page: "a.html", kb: 100 },
  { page: "b.html", kb: 300 },
];

test("a page view is the mean weight run through SWD v4, green host lower than not", () => {
  const f = footprint(rows);
  expect(f.viewKb).toBe(200);
  // SWD v4: 148.2 g CO2e per GB, 121.0 with a green data centre
  expect(f.view.high).toBeCloseTo((200 * 1024 * 148.2) / 1e9, 4);
  expect(f.view.low).toBeCloseTo((200 * 1024 * 121.03) / 1e9, 4);
  expect(f.view.low).toBeLessThan(f.view.high);
  expect([f.minKb, f.maxKb]).toEqual([100, 300]);
});

test("a demo run is the sum of its downloads, and views per demo is the byte ratio", () => {
  const f = footprint(rows);
  const bytes = Object.values(DEMO_DOWNLOAD).reduce((a, b) => a + b, 0);
  expect(f.demoMb).toBeCloseTo(bytes / 1e6, 6);
  expect(f.viewsPerDemo).toBeCloseTo(bytes / (200 * 1024), 6);
});

test("the verdict follows the ratio", () => {
  const verdict = (kb: number) => footprintTokens(footprint([{ page: "a", kb }])).verdict;
  expect(verdict(10)).toMatch(/thousands/);
  expect(verdict(200)).toMatch(/about a thousand/);
  expect(verdict(2000)).toMatch(/does not hold/);
});

test("fillTokens fills every token and throws on an unknown one", () => {
  expect(fillTokens("a %%fp:x%% b %%fp:x%%", { x: "1" })).toBe("a 1 b 1");
  expect(() => fillTokens("%%fp:nope%%", {})).toThrow(/nope/);
});
