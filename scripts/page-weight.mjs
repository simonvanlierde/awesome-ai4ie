#!/usr/bin/env node
/**
 * Fails when a built page's first-visit weight goes over its budget. Weight is the
 * gzipped size of the page's HTML plus the same-origin files it references (CSS,
 * JS, preloaded fonts, images, icons); gzip is a fair proxy for bytes on the wire.
 * Cross-origin requests are not counted: the zero-shot demo downloads ~150 MB of
 * model from Hugging Face only when the user clicks. Fonts reached only through
 * CSS @font-face and lazy imports (Pagefind) load on demand and are not counted.
 *
 *   pnpm run build && pnpm run page-weight
 */

import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { basePath } from "../src/site.ts";

// Default per-page budget in KB: the heaviest page today plus ~20% headroom.
export const DEFAULT_BUDGET_KB = 230;
// Per-page overrides in KB, keyed by the path under dist/ (e.g. "literature/index.html").
export const OVERRIDES = {};

const TAG = /<(script|link|img)\b[^>]*>/g;
const LINK_REL = /\b(stylesheet|preload|modulepreload|icon)\b/;
const QUERY = /[?#]/;

function attr(tag, name) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

/** Same-origin asset paths a page's HTML references, deduplicated. */
export function extractAssets(html) {
  const found = new Set();
  for (const [tag, name] of html.matchAll(TAG).map((m) => [m[0], m[1]])) {
    if (name === "link" && !LINK_REL.test(attr(tag, "rel") ?? "")) continue;
    const ref = attr(tag, name === "link" ? "href" : "src");
    // Root-relative only: skips https:, //host, data: and #fragments.
    if (ref?.startsWith("/") && !ref.startsWith("//")) found.add(ref.split(QUERY)[0]);
  }
  return [...found];
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
  // Built hrefs carry the base path; dist/ does not.
  const assets = extractAssets(html).map(
    (a) => `dist${decodeURIComponent(a.slice(a.startsWith(`${basePath}/`) ? basePath.length : 0))}`,
  );
  const sizes = await Promise.all([`dist/${page}`, ...assets].map(gzipped));
  return { page, kb: sizes.reduce((a, b) => a + b, 0) / 1024 };
}

async function main() {
  const pages = (await readdir("dist", { recursive: true })).filter((f) => f.endsWith(".html"));
  const rows = (await Promise.all(pages.map(weigh))).sort((a, b) => b.kb - a.kb);
  console.log(`${"page".padEnd(46)}${"KB (gzip)".padStart(10)}${"budget".padStart(8)}`);
  for (const r of rows) {
    const kb = r.kb.toFixed(1).padStart(10);
    console.log(`${r.page.padEnd(46)}${kb}${String(budgetOf(r.page)).padStart(8)}`);
  }
  const over = overBudget(rows);
  for (const r of over) {
    console.error(`over budget: ${r.page} ${r.kb.toFixed(1)} KB > ${budgetOf(r.page)} KB`);
  }
  process.exit(over.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
