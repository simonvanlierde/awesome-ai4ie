#!/usr/bin/env node
/**
 * Runs axe (WCAG 2.2 AA) on every page of the built site, in light and dark,
 * and exits 1 on any violation. Hugging Face Space iframes are third-party and excluded.
 *
 *   npm run build && npx astro preview &   # serves dist/ at the base path
 *   npm run test:a11y                      # defaults to http://localhost:4321/awesome-ai4ie/
 *
 * Needs a Chromium for Playwright: `npx playwright install chromium`.
 */

import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";

const root = process.argv[2] ?? "http://localhost:4321/awesome-ai4ie/";
const INDEX_HTML = /index\.html$/;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Every built page, as a path relative to the site root ('' is the home page).
// Redirect stubs are skipped: their meta refresh navigates away mid-scan.
const pages = [];
for (const f of await readdir("dist", { recursive: true })) {
  if (
    f.endsWith("index.html") &&
    !(await readFile(`dist/${f}`, "utf8")).includes('http-equiv="refresh"')
  ) {
    pages.push(f.replace(INDEX_HTML, ""));
  }
}

const browser = await chromium.launch();
let violations = 0;
for (const colorScheme of ["light", "dark"]) {
  const page = await (await browser.newContext({ colorScheme })).newPage();
  for (const path of pages) {
    await page.goto(new URL(path, root).href);
    const result = await new AxeBuilder({ page }).withTags(TAGS).exclude("iframe").analyze();
    for (const v of result.violations) {
      console.log(
        `${colorScheme} /${path}: ${v.id} (${v.impact}) at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
      console.log(`  ${v.nodes[0].failureSummary?.split("\n").slice(1).join(" ").trim()}`);
    }
    violations += result.violations.length;
  }
}
await browser.close();
console.log(`axe: ${pages.length} page(s) × 2 colour schemes, ${violations} violation(s).`);
process.exit(violations ? 1 : 0);
