#!/usr/bin/env node
/**
 * Fails when a built page's first-visit weight goes over its budget. Weight is the
 * gzipped size of the page's HTML plus the same-origin files it references (CSS,
 * JS, island scripts and the modules they import statically, preloaded fonts, images,
 * icons); gzip is a fair proxy for bytes on the wire.
 * Cross-origin requests are not counted: the CLIP demo downloads ~180 MB of model and
 * runtime (DEMO_DOWNLOAD in src/lib/footprint.mjs) only when the user clicks. Fonts reached only through
 * CSS @font-face and dynamic import() chunks (Pagefind, the citation records) load on
 * demand and are not counted.
 *
 * weighAll() is also exported: the footprint page (src/plugins/footprint.mjs) reads its
 * page weights from it.
 *
 *   pnpm run build && pnpm run page-weight
 */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { posix } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { basePath } from "../src/site.ts";

// Per-page budget in kB (1,000 bytes): the heaviest page without a React island (186 kB)
// plus ~20%.
export const DEFAULT_BUDGET_KB = 225;
// Per-page overrides in kB, keyed by the path under dist/. The island pages ship React
// (about 70 kB gzipped); each is budgeted at its weight on 2026-11-20 plus ~20%.
/** @type {Record<string, number>} */
export const OVERRIDES = {
  "literature/index.html": 323,
  "applications-map/index.html": 312,
  "demos/index.html": 307,
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

/** The file under `root` for a built URL: hrefs carry the base path, the build folder does not. */
export function toDist(url, base = basePath, root = "dist") {
  return `${root}${decodeURIComponent(url.slice(base && url.startsWith(`${base}/`) ? base.length : 0))}`;
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

const KINDS = [
  ["css", /\.css$/],
  ["js", /\.m?js$/],
  ["fonts", /\.(woff2?|ttf|otf)$/],
  ["images", /\.(svg|png|jpe?g|webp|avif|gif|ico)$/],
];

/** The asset type a file counts under in a page's parts. */
export function kindOf(url) {
  return KINDS.find(([, re]) => re.test(url))?.[0] ?? "other";
}

async function weigh(page, root) {
  const html = await readFile(`${root}/${page}`, "utf8");
  const seen = new Set(extractAssets(html));
  const queue = [...seen];
  const parts = {
    html: await gzipped(`${root}/${page}`),
    css: 0,
    js: 0,
    fonts: 0,
    images: 0,
    other: 0,
  };
  while (queue.length) {
    const url = queue.shift();
    const file = toDist(url, basePath, root);
    parts[kindOf(url)] += await gzipped(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
      throw new Error(`missing asset: ${url} in ${page} (check basePath)`, { cause: e });
    });
    if (!url.endsWith(".js")) continue;
    for (const dep of staticImports(await readFile(file, "utf8"), url)) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      queue.push(dep);
    }
  }
  const kb = Object.values(parts).reduce((x, y) => x + y, 0) / 1000;
  for (const k of Object.keys(parts)) parts[k] /= 1000;
  return { page, kb, budget: budgetOf(page), parts };
}

/**
 * Every built page as {page, kb, budget, parts}, heaviest first; `parts` splits kb by asset
 * type (html, css, js, fonts, images, other). Meta-refresh redirect stubs and 404.html
 * are left out: they are not pages a reader views.
 */
export async function weighAll(root = "dist") {
  const files = await readdir(root, { recursive: true });
  const pages = [];
  for (const f of files.filter((name) => name.endsWith(".html") && name !== "404.html")) {
    if (!(await readFile(`${root}/${f}`, "utf8")).includes('http-equiv="refresh"')) pages.push(f);
  }
  return (await Promise.all(pages.map((f) => weigh(f, root)))).sort((a, b) => b.kb - a.kb);
}

async function main() {
  if (!existsSync("dist")) {
    console.error("No dist/ folder: run `pnpm run build` first.");
    process.exit(2);
  }
  const rows = await weighAll().catch((e) => {
    console.error(e.message);
    process.exit(2);
  });
  console.log(`${"page".padEnd(46)}${"kB (gzip)".padStart(10)}${"budget".padStart(8)}`);
  for (const r of rows) {
    const kb = r.kb.toFixed(1).padStart(10);
    console.log(`${r.page.padEnd(46)}${kb}${String(r.budget).padStart(8)}`);
  }
  const over = overBudget(rows);
  for (const r of over) {
    console.error(`over budget: ${r.page} ${r.kb.toFixed(1)} kB > ${r.budget} kB`);
  }
  if (over.length) {
    console.error(
      "Reproduce with `node scripts/page-weight.mjs` after the build. Make the page lighter, or raise " +
        "DEFAULT_BUDGET_KB or add an OVERRIDES entry in scripts/page-weight.mjs, with the reason in the PR.",
    );
  }
  process.exit(over.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
