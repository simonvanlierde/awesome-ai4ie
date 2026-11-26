import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { weighAll } from "../../scripts/page-weight.mjs";
import {
  compareFigure,
  DEMO_DOWNLOAD,
  fillTokens,
  footprint,
  footprintTokens,
  pageFigure,
} from "./footprint.mjs";

// page-weight rows are KiB; the page shows decimal kB.
const rows = [
  { page: "a/index.html", kb: 100, budget: 200 },
  { page: "b/index.html", kb: 300, budget: 400 },
];
const KIB = 1.024;

test("a page view is the mean weight run through SWD v4, green host lower than not", () => {
  const f = footprint(rows);
  expect(f.viewKb).toBeCloseTo(200 * KIB, 9);
  // SWD v4: 148.2 g CO2e per GB, 121.0 with a green data centre
  expect(f.view.high).toBeCloseTo((200 * 1024 * 148.2) / 1e9, 4);
  expect(f.view.low).toBeCloseTo((200 * 1024 * 121.03) / 1e9, 4);
  expect(f.view.low).toBeLessThan(f.view.high);
  expect([f.minKb, f.maxKb]).toEqual([100 * KIB, 300 * KIB]);
});

test("a demo run is the sum of its downloads, and views per demo is the byte ratio", () => {
  const f = footprint(rows);
  const bytes = Object.values(DEMO_DOWNLOAD).reduce((a, b) => a + b, 0);
  expect(f.demoMb).toBeCloseTo(bytes / 1e6, 6);
  expect(f.viewsPerDemo).toBeCloseTo(bytes / (200 * 1024), 6);
});

test("every text token for fixed rows", () => {
  const { pageFigure: _p, compareFigure: _c, ...text } = footprintTokens(footprint(rows));
  expect(text).toEqual({
    pages: "2",
    viewKb: "205",
    minKb: "102",
    maxKb: "307",
    thousandMb: "205",
    demoMb: "182",
    onnxMb: "154",
    view: "25 mg to 30 mg",
    thousandViews: "25 g to 30 g",
    demo: "22 g to 27 g",
    viewsPerDemo: "890",
    dataCentreGb: "6 to 33 g/GB",
    networkGb: "36 g/GB",
    deviceGb: "80 g/GB",
    totalGb: "121 to 148 g/GB",
    deviceShare: "54%",
    gridIntensity: "494",
  });
});

test("the background segments add up to the total, green host or not", () => {
  const { dataCentre, network, device, total } = footprint(rows).perGb;
  for (const end of ["low", "high"] as const) {
    expect(dataCentre[end] + network[end] + device[end]).toBeCloseTo(total[end], 9);
  }
  expect(dataCentre.low).toBeLessThan(dataCentre.high);
});

test("the page figure lists pages heaviest first, on one scale up to the largest budget", () => {
  const html = pageFigure(footprint(rows), "b/index.html");
  const names = [...html.matchAll(/class="fp-name">([^<]*)</g)].map((m) => m[1]);
  expect(names).toEqual(["/b/ (this page)", "/a/"]);
  // b: 300 of a 400 KiB scale, its budget tick at the end; a: 100, tick at 200.
  expect(html).toContain('--w:75.00%"></span><span class="fp-limit" style="--x:100.00%"');
  expect(html).toContain('--w:25.00%"></span><span class="fp-limit" style="--x:50.00%"');
  expect(html).toContain('<span class="sr-only">, budget 410 kB</span>');
  expect(html.match(/<li/g)).toHaveLength(2);
});

test("the comparison figure splits each bar into the green-host part and the rest", () => {
  const f = footprint(rows);
  const html = compareFigure(f);
  const widths = [...html.matchAll(/--w:([\d.]+)%/g)].map((m) => Number(m[1]));
  expect(widths).toHaveLength(6);
  // Each pair adds up to the high end, and the largest high end fills the scale.
  const ends = [0, 2, 4].map((i) => widths[i] + widths[i + 1]);
  expect(Math.max(...ends)).toBeCloseTo(100, 1);
  expect(html).toContain(">One page view<");
  expect(html).toMatch(/0\.025 to 0\.030 g/);
});

test("a page name with markup is escaped", () => {
  const html = pageFigure(footprint([{ page: "<b>/index.html", kb: 1 }]), "");
  expect(html).toContain("/&lt;b&gt;/");
});

test("footprint throws without rows", () => {
  expect(() => footprint([])).toThrow(/no page-weight rows/);
});

test("fillTokens fills every token and throws on an unknown one", () => {
  expect(fillTokens("a %%fp:x%% b %%fp:x%%", { x: "1" })).toBe("a 1 b 1");
  expect(() => fillTokens("%%fp:nope%%", {})).toThrow(/nope/);
});

test("weighAll weighs assets under the given root, not ./dist", async () => {
  const root = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(root, "_astro"));
  writeFileSync(join(root, "_astro/a.css"), "x".repeat(5000));
  writeFileSync(join(root, "index.html"), '<link rel="stylesheet" href="/_astro/a.css">');
  const [row] = await weighAll(root);
  expect(row).toMatchObject({ page: "index.html", budget: 220 });
  expect(row.kb).toBeGreaterThan(0);
});

test("weighAll skips redirect stubs and 404.html", async () => {
  const root = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(root, "a"));
  writeFileSync(join(root, "a/index.html"), "<html>page</html>");
  writeFileSync(join(root, "stub.html"), '<meta http-equiv="refresh" content="0; url=/a/">');
  writeFileSync(join(root, "404.html"), "<html>missing</html>");
  expect((await weighAll(root)).map((r) => r.page)).toEqual(["a/index.html"]);
});
