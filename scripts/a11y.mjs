#!/usr/bin/env node
/**
 * Runs axe (WCAG 2.2 AA) on every page of the built site, in light and dark, at
 * desktop and phone width. Exits 1 on any violation, or on a page wider than
 * the screen at phone width or at 320px with text at 200% (WCAG 1.4.10
 * Reflow). Hugging Face Space iframes are third-party and excluded. Checks
 * axe could not decide ("incomplete", e.g. contrast of text over a figure) are
 * listed but do not fail the run.
 *
 *   npm run build && npx astro preview &   # serves dist/ at the base path
 *   npm run test:a11y                      # defaults to localhost:4321 at the base path
 *
 * Needs a Chromium for Playwright: `npx playwright install chromium`.
 */

import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { basePath } from "../src/site.ts";

const root = process.argv[2] ?? `http://localhost:4321${basePath}/`;
const INDEX_HTML = /index\.html$/;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Every built page, as a path relative to the site root ('' is the home page),
// plus the 404 page. Redirect stubs are skipped: their meta refresh navigates
// away mid-scan.
const pages = ["404.html"];
for (const f of await readdir("dist", { recursive: true })) {
  if (
    f.endsWith("index.html") &&
    !(await readFile(`dist/${f}`, "utf8")).includes('http-equiv="refresh"')
  ) {
    pages.push(f.replace(INDEX_HTML, ""));
  }
}

const browser = await chromium.launch();
const VIEWPORTS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
let violations = 0;
const incomplete = new Map();
for (const colorScheme of ["light", "dark"]) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const page = await (await browser.newContext({ colorScheme, viewport })).newPage();
    for (const path of pages) {
      const where = `${colorScheme} ${name} /${path}`;
      await page.goto(new URL(path, root).href);
      const result = await new AxeBuilder({ page }).withTags(TAGS).exclude("iframe").analyze();
      for (const v of result.violations) {
        console.log(
          `${where}: ${v.id} (${v.impact}) at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
        console.log(`  ${v.nodes[0].failureSummary?.split("\n").slice(1).join(" ").trim()}`);
      }
      violations += result.violations.length;
      for (const v of result.incomplete)
        incomplete.set(
          `/${path} ${v.id}`,
          Math.max(incomplete.get(`/${path} ${v.id}`) ?? 0, v.nodes.length),
        );
      const wider = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (wider > 0) {
        console.log(`${where}: page is ${wider}px wider than the screen (reflow)`);
        violations += 1;
      }
    }
  }
}
// Reflow at the narrowest width WCAG names (320px) with text at 200%.
{
  const page = await (
    await browser.newContext({ viewport: { width: 320, height: 700 } })
  ).newPage();
  for (const path of pages) {
    await page.goto(new URL(path, root).href);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const wider = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (wider > 0) {
      console.log(`320px, 200% text /${path}: page is ${wider}px wider than the screen (reflow)`);
      violations += 1;
    }
  }
}
// Interactions axe cannot reach by loading a page: open states and focus.
function fail(msg) {
  console.log(`interaction: ${msg}`);
  violations += 1;
}
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto(new URL("literature/", root).href, { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "AI technique" });
  await trigger.click();
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    fail(`${name}: filter button not expanded`);
  const open = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of open.violations) fail(`${name}: with the filter panel open, ${v.id}`);
  await trigger.focus();
  await page.keyboard.press("Escape");
  if ((await trigger.getAttribute("aria-expanded")) !== "false")
    fail(`${name}: Escape on the filter button left the panel open`);
  await trigger.click();
  await page.getByRole("button", { name: "Computer vision", exact: true }).click();
  await page.getByRole("button", { name: "Remove filter: Computer vision" }).click();
  if (await page.evaluate(() => document.activeElement === document.body))
    fail(`${name}: removing a filter dropped focus to the page`);
  await page.goto(new URL("applications-map/", root).href, { waitUntil: "networkidle" });
  const extra = await page.$eval(".apx-grid-wrap", (w) => w.scrollWidth - w.offsetWidth);
  const table = await page.$eval(".apx-grid", (t) => t.offsetWidth);
  const wrap = await page.$eval(".apx-grid-wrap", (w) => w.offsetWidth);
  if (extra > Math.max(0, table - wrap) + 1)
    fail(`${name}: the map grid scrolls ${extra}px though its table needs ${table - wrap}px`);
}

await browser.close();
for (const [key, n] of incomplete) console.log(`not decided by axe: ${key} (${n} node(s))`);
console.log(
  `axe: ${pages.length} page(s) × 2 colour schemes × 2 widths, ${violations} violation(s).`,
);
process.exit(violations ? 1 : 0);
