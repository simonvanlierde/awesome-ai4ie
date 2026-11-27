import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { extractAssets, overBudget, staticImports, toDist } from "./page-weight.mjs";

const pages = (rows: { page: string }[]) => rows.map((r) => r.page);

test("extractAssets keeps same-origin css, js, preloads, icons and images", () => {
  const html = `
    <link rel="icon" href="/favicon.svg">
    <link rel="preload" as="font" href="/_astro/a.woff2">
    <link rel="stylesheet" href="/_astro/a.css?v=1">
    <link rel="canonical" href="https://ai4ie.org/">
    <link rel="sitemap" href="/sitemap-index.xml">
    <script src="/_astro/a.js"></script>
    <script src="https://cdn.example/x.js"></script>
    <img src="/_astro/a.png"><img src="//host/b.png"><img src="data:image/png;base64,AAAA">
    <a href="/other/">link</a>`;
  expect(extractAssets(html)).toEqual([
    "/favicon.svg",
    "/_astro/a.woff2",
    "/_astro/a.css",
    "/_astro/a.js",
    "/_astro/a.png",
  ]);
});

test("overBudget applies the default and per-page overrides", () => {
  const rows = [
    { page: "a.html", kb: 120 },
    { page: "b.html", kb: 120 },
  ];
  expect(pages(overBudget(rows, 100, {}))).toEqual(["a.html", "b.html"]);
  expect(pages(overBudget(rows, 100, { "b.html": 150 }))).toEqual(["a.html"]);
});

test("extractAssets reads island scripts and single-quoted, reordered attributes", () => {
  const html = `
    <astro-island uid="x" component-url="/_astro/List.js" renderer-url="/_astro/client.js" before-hydration-url="/_astro/before.js"></astro-island>
    <LINK HREF='/_astro/b.css' REL='stylesheet'>`;
  expect(extractAssets(html)).toEqual([
    "/_astro/List.js",
    "/_astro/client.js",
    "/_astro/before.js",
    "/_astro/b.css",
  ]);
});

test("staticImports follows static imports and skips dynamic and cross-origin ones", () => {
  const js = `import{t as e}from"./react.js";import"./side.js";import x from "/_astro/abs.js";const c=()=>import("./lazy.js");import y from"https://cdn.example/z.js";`;
  expect(staticImports(js, "/_astro/List.js")).toEqual([
    "/_astro/react.js",
    "/_astro/side.js",
    "/_astro/abs.js",
  ]);
});

test("toDist strips the base path and decodes the file name", () => {
  expect(toDist("/repo/_astro/a%20b.js", "/repo")).toBe("dist/_astro/a b.js");
  expect(toDist("/_astro/a.js", "")).toBe("dist/_astro/a.js");
  expect(toDist("/repository/x.js", "/repo")).toBe("dist/repository/x.js");
});

test("the CLI names a missing asset, and says when dist/ itself is missing", () => {
  const script = fileURLToPath(new URL("./page-weight.mjs", import.meta.url));
  const cwd = mkdtempSync(join(tmpdir(), "pw-"));
  const run = () => spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
  expect(run()).toMatchObject({ status: 2, stderr: expect.stringContaining("No dist/ folder") });
  mkdirSync(join(cwd, "dist"));
  writeFileSync(join(cwd, "dist/index.html"), '<link rel="stylesheet" href="/_astro/gone.css">');
  const missing = run();
  expect(missing.status).toBe(2);
  expect(missing.stderr).toContain(
    "missing asset: /_astro/gone.css in index.html (check basePath)",
  );
  expect(missing.stderr).not.toContain("No dist/ folder");
});
