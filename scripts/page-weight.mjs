#!/usr/bin/env node
/**
 * Fails when a built page's first-visit weight goes over its budget. Weight is the
 * gzipped size of the page's HTML plus the same-origin files it references (CSS,
 * JS, island scripts and the modules they import statically, preloaded fonts, images,
 * icons); gzip is a fair proxy for bytes on the wire.
 * Cross-origin requests are not counted: the zero-shot demo downloads ~150 MB of
 * model from Hugging Face only when the user clicks. Fonts reached only through
 * CSS @font-face and dynamic import() chunks (Pagefind, the citation records) load on
 * demand and are not counted.
 *
 *   pnpm run build && pnpm run page-weight
 */

import { readdir, readFile } from "node:fs/promises";
import { posix } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { basePath } from "../src/site.ts";

// Per-page budget in KB: the heaviest page without a React island (182 KB) plus ~20%.
export const DEFAULT_BUDGET_KB = 220;
// Per-page overrides in KB, keyed by the path under dist/. The island pages ship React
// (about 70 KB gzipped); each is budgeted at its weight on 2026-11-20 plus ~20%.
/** @type {Record<string, number>} */
export const OVERRIDES = {
  "literature/index.html": 315,
  "applications-map/index.html": 305,
  "demos/index.html": 300,
};

const TAG = /<(script|link|img|astro-island)\b[^>]*>/gi;
const LINK_REL = /\b(stylesheet|preload|modulepreload|icon)\b/;
const ISLAND_URLS = ["component-url", "renderer-url", "before-hydration-url"];
// Static `import ... from "x"` and `import "x"`; `import("x")` has a paren and stays out.
const STATIC_IMPORT = /\b(?:from|import)\s*["']([^"']+)["']/g;
const QUERY = /[?#]/;

function attr(tag, name) {
  return new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i").exec(tag)?.slice(1).find(Boolean);
}

// Root-relative only: skips https:, //host, data: and #fragments.
function sameOrigin(ref) {
  return ref?.startsWith("/") && !ref.startsWith("//") ? ref.split(QUERY)[0] : undefined;
}

/** Same-origin asset paths a page's HTML references, deduplicated. */
export function extractAssets(html) {
  const found = new Set();
  for (const [tag, name] of html.matchAll(TAG).map((m) => [m[0], m[1].toLowerCase()])) {
    if (name === "link" && !LINK_REL.test(attr(tag, "rel") ?? "")) continue;
    const refs =
      name === "astro-island"
        ? ISLAND_URLS.map((a) => attr(tag, a))
        : [attr(tag, name === "link" ? "href" : "src")];
    for (const ref of refs.map(sameOrigin).filter(Boolean)) found.add(ref);
  }
  return [...found];
}

/** Same-origin modules a JS file at `url` imports statically. */
export function staticImports(js, url) {
  const out = [];
  for (const [, spec] of js.matchAll(STATIC_IMPORT)) {
    if (spec.startsWith(".")) out.push(posix.resolve(posix.dirname(url), spec));
    else if (sameOrigin(spec)) out.push(sameOrigin(spec));
  }
  return out;
}

/** The dist/ file for a built URL: hrefs carry the base path, dist/ does not. */
export function toDist(url, base = basePath) {
  return `dist${decodeURIComponent(url.slice(base && url.startsWith(`${base}/`) ? base.length : 0))}`;
}

function budgetOf(page, defaultKb = DEFAULT_BUDGET_KB, overrides = OVERRIDES) {
  return overrides[page] ?? defaultKb;
}

/** Rows ({page, kb}) over their budget. */
export function overBudget(rows, defaultKb = DEFAULT_BUDGET_KB, overrides = OVERRIDES) {
  return rows.filter((r) => r.kb > budgetOf(r.page, defaultKb, overrides));
}

async function gzipped(file) {
  return gzipSync(await readFile(file)).length;
}

async function weigh(page) {
  const html = await readFile(`dist/${page}`, "utf8");
  const seen = new Set(extractAssets(html));
  const queue = [...seen];
  let bytes = await gzipped(`dist/${page}`);
  while (queue.length) {
    const url = queue.shift();
    const file = toDist(url);
    bytes += await gzipped(file);
    if (!url.endsWith(".js")) continue;
    for (const dep of staticImports(await readFile(file, "utf8"), url)) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      queue.push(dep);
    }
  }
  return { page, kb: bytes / 1024 };
}

/** Every built page as {page, kb}, heaviest first. Reads dist/ under the working directory. */
export async function weighAll() {
  const files = await readdir("dist", { recursive: true });
  const pages = files.filter((f) => f.endsWith(".html"));
  return (await Promise.all(pages.map(weigh))).sort((a, b) => b.kb - a.kb);
}

async function main() {
  const rows = await weighAll().catch(() => {
    console.error("No dist/ folder: run `pnpm run build` first.");
    process.exit(2);
  });
  console.log(`${"page".padEnd(46)}${"KB (gzip)".padStart(10)}${"budget".padStart(8)}`);
  for (const r of rows) {
    const kb = r.kb.toFixed(1).padStart(10);
    console.log(`${r.page.padEnd(46)}${kb}${String(budgetOf(r.page)).padStart(8)}`);
  }
  const over = overBudget(rows);
  for (const r of over) {
    console.error(`over budget: ${r.page} ${r.kb.toFixed(1)} KB > ${budgetOf(r.page)} KB`);
  }
  if (over.length) {
    console.error(
      "Reproduce with `pnpm run build && pnpm run page-weight`. Make the page lighter, or raise " +
        "DEFAULT_BUDGET_KB or add an OVERRIDES entry in scripts/page-weight.mjs, with the reason in the PR.",
    );
  }
  process.exit(over.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
