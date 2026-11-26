import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { weighAll } from "../../scripts/page-weight.mjs";
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

test("every token for fixed rows", () => {
  expect(footprintTokens(footprint(rows))).toEqual({
    pages: "2",
    viewKb: "200",
    minKb: "100",
    maxKb: "300",
    demoMb: "182",
    onnxMb: "154",
    view: "25 mg to 30 mg",
    thousandViews: "25 g to 30 g",
    demo: "22 g to 27 g",
    viewsPerDemo: "890",
    verdict: "One demo run weighs as much as about 890 page views.",
  });
});

test("footprint throws without rows", () => {
  expect(() => footprint([])).toThrow(/no page-weight rows/);
});

test("fillTokens fills every token and throws on an unknown one", () => {
  expect(fillTokens("a %%fp:x%% b %%fp:x%%", { x: "1" })).toBe("a 1 b 1");
  expect(() => fillTokens("%%fp:nope%%", {})).toThrow(/nope/);
});

test("weighAll skips redirect stubs and 404.html", async () => {
  const root = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(root, "a"));
  writeFileSync(join(root, "a/index.html"), "<html>page</html>");
  writeFileSync(join(root, "stub.html"), '<meta http-equiv="refresh" content="0; url=/a/">');
  writeFileSync(join(root, "404.html"), "<html>missing</html>");
  expect((await weighAll(root)).map((r) => r.page)).toEqual(["a/index.html"]);
});
