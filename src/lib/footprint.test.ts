import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { DEFAULT_BUDGET_KB, kindOf, weighAll } from "../../scripts/page-weight.mjs";
import {
  compareFigure,
  DEMO_DOWNLOAD,
  fillTokens,
  footprint,
  footprintTokens,
  pageFigure,
  pageTable,
  partsFigure,
  WEB_MEDIAN_KB,
} from "./footprint.mjs";

const rows = [
  { page: "a/index.html", kb: 100, budget: 200 },
  { page: "b/index.html", kb: 300, budget: 400 },
];

test("a page view is the mean weight run through SWD v4, green host lower than not", () => {
  const f = footprint(rows);
  expect(f.viewKb).toBe(200);
  // SWD v4: 148.2 g CO2e per GB, 121.0 with a green data centre
  expect(f.view.high).toBeCloseTo((200e3 * 148.2) / 1e9, 4);
  expect(f.view.low).toBeCloseTo((200e3 * 121.03) / 1e9, 4);
  expect(f.view.low).toBeLessThan(f.view.high);
  expect([f.minKb, f.maxKb]).toEqual([100, 300]);
});

test("a demo run is the sum of its downloads, and views per demo is the byte ratio", () => {
  const f = footprint(rows);
  const bytes = Object.values(DEMO_DOWNLOAD).reduce((a, b) => a + b, 0);
  expect(f.demoMb).toBeCloseTo(bytes / 1e6, 6);
  expect(f.viewsPerDemo).toBeCloseTo(bytes / 200e3, 6);
});

test("every text token for fixed rows", () => {
  const {
    pageFigure: _p,
    pageTable: _t,
    partsFigure: _f,
    compareFigure: _c,
    ...text
  } = footprintTokens(footprint(rows));
  expect(text).toEqual({
    pages: "2",
    viewKb: "200",
    minKb: "100",
    maxKb: "300",
    thousandMb: "200",
    demoMb: "182",
    onnxMb: "154",
    view: "24 mg to 30 mg",
    thousandViews: "24 g to 30 g",
    demo: "22 g to 27 g",
    viewsPerDemo: "910",
    dataCentreGb: "6 to 33 g/GB",
    networkGb: "36 g/GB",
    deviceGb: "80 g/GB",
    totalGb: "121 to 148 g/GB",
    deviceShare: "54%",
    deviceEmbodiedShare: "50%",
    gridIntensity: "494",
    shellKb: "100",
    largestPart: "other files",
    largestShare: "0%",
    secondPart: "other files",
    secondShare: "0%",
    webDesktopKb: "2,862",
    webMobileKb: "2,559",
    webDesktop: "346 mg to 424 mg",
    webMobile: "310 mg to 379 mg",
    webTimes: "13",
  });
});

test("the background segments add up to the total, green host or not", () => {
  const { dataCentre, network, device, total } = footprint(rows).perGb;
  for (const end of ["low", "high"] as const) {
    expect(dataCentre[end] + network[end] + device[end]).toBeCloseTo(total[end], 9);
  }
  expect(dataCentre.low).toBeLessThan(dataCentre.high);
});

test("the page figure shows pages over 1.1 × the median, then one row for the rest", () => {
  const many = [
    { page: "big/index.html", kb: 300, budget: 400 },
    ...[100, 102, 104, 108].map((kb, i) => ({ page: `p${i}/index.html`, kb, budget: 200 })),
  ];
  const html = pageFigure(footprint(many), "big/index.html");
  const names = [...html.matchAll(/class="fp-name">([^<]*)</g)].map((m) => m[1]);
  expect(names).toEqual(["/big/ (this page)", "4 other pages"]);
  // big: 300 of a 400 kB scale, its budget tick at the end; the rest at their mean, 103.5.
  expect(html).toContain('--w:75.00%"></span><span class="fp-limit" style="--x:100.00%"');
  expect(html).toContain('<span class="sr-only">, budget 400 kB</span>');
  expect(html).toContain(">100 to 108 kB<");
  expect(html).toContain('--w:25.87%"');
});

test("the page table lists every page with its budget and CO2e", () => {
  const html = pageTable(footprint(rows), "a/index.html");
  expect(html.match(/<tr>/g)).toHaveLength(3);
  expect(html).toContain("<td>/b/</td><td>300</td><td>400</td><td>36–44</td>");
  expect(html).toContain("<td>/a/ (this page)</td>");
});

test("parts are the mean page view by asset type, largest first, as shares of the whole", () => {
  const parts = (fonts: number, js: number) => ({
    html: 10,
    css: 0,
    js,
    fonts,
    images: 0,
    other: 0,
  });
  const f = footprint([
    { page: "a.html", kb: 110, parts: parts(100, 0) },
    { page: "b.html", kb: 140, parts: parts(100, 30) },
  ]);
  expect(f.parts).toEqual([
    { kind: "fonts", kb: 100 },
    { kind: "js", kb: 15 },
    { kind: "html", kb: 10 },
  ]);
  const t = footprintTokens(f);
  expect([t.largestPart, t.largestShare, t.secondPart, t.secondShare]).toEqual([
    "fonts",
    "80%",
    "JavaScript",
    "12%",
  ]);
  expect(partsFigure(f)).toContain('>Fonts</span><span class="fp-val">100 kB, 80%<');
  const small = footprint([{ page: "a.html", kb: 200, parts: { ...parts(199, 0), html: 1 } }]);
  expect(partsFigure(small)).toContain(">1 kB, 0.5%<");
});

test("the web median is converted with the same model as a page view", () => {
  const f = footprint(rows);
  const t = footprintTokens(f);
  expect(f.web.mobile.high).toBeCloseTo((WEB_MEDIAN_KB.mobile * 1e3 * 148.2) / 1e9, 6);
  expect(t.webTimes).toBe((WEB_MEDIAN_KB.mobile / 200).toFixed(0));
});

test("kindOf sorts files by extension", () => {
  expect(["/a.css", "/a.js", "/a.mjs", "/f.woff2", "/i.svg", "/x.json"].map(kindOf)).toEqual([
    "css",
    "js",
    "js",
    "fonts",
    "images",
    "other",
  ]);
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
  expect(html).toMatch(/0\.024 to 0\.030 g/);
});

test("the home page is named, not shown as a bare slash", () => {
  expect(pageTable(footprint([{ page: "index.html", kb: 1 }]), "")).toContain(">/ (home)<");
});

test("a page name with markup is escaped", () => {
  const html = pageTable(footprint([{ page: "<b>/index.html", kb: 1 }]), "");
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
  expect(row).toMatchObject({ page: "index.html", budget: DEFAULT_BUDGET_KB });
  expect(row.parts.css).toBeGreaterThan(0);
  expect(row.parts.html).toBeGreaterThan(0);
  const sum = Object.values(row.parts as Record<string, number>).reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(row.kb, 9);
});

test("weighAll skips redirect stubs and 404.html", async () => {
  const root = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(root, "a"));
  writeFileSync(join(root, "a/index.html"), "<html>page</html>");
  writeFileSync(join(root, "stub.html"), '<meta http-equiv="refresh" content="0; url=/a/">');
  writeFileSync(join(root, "404.html"), "<html>missing</html>");
  expect((await weighAll(root)).map((r) => r.page)).toEqual(["a/index.html"]);
});
