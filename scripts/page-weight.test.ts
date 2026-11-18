import { expect, test } from "vitest";
import { extractAssets, overBudget } from "./page-weight.mjs";

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
