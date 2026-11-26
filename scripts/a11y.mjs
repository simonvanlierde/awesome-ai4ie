#!/usr/bin/env node
/**
 * Runs axe (WCAG 2.2 AA) on every page of the built site, in light and dark, at
 * desktop and phone width. Exits 1 on any violation, or on a page wider than
 * the screen at phone width or at 320px with text at 200% (WCAG 1.4.10
 * Reflow). Hugging Face Space iframes are third-party and excluded. Checks
 * axe could not decide ("incomplete", e.g. contrast of text over a figure) are
 * listed but do not fail the run.
 *
 *   pnpm run build && pnpm exec astro preview &   # serves dist/ at the base path
 *   pnpm run test:a11y                            # defaults to localhost:4321 at the base path
 *
 * Needs a Chromium for Playwright: `pnpm exec playwright install chromium`.
 */

import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { basePath } from "../src/site.ts";
import { withoutSearchHint } from "./lib/axe-filter.mjs";

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
    // axe reads only the DOM, so a script the CSP blocks (theme toggle, search) would pass.
    let where = "";
    page.on("console", (msg) => {
      if (msg.text().includes("Content Security Policy")) {
        console.log(`${where}: blocked by the CSP: ${msg.text()}`);
        violations += 1;
      }
    });
    for (const path of pages) {
      where = `${colorScheme} ${name} /${path}`;
      await page.goto(new URL(path, root).href);
      const result = await new AxeBuilder({ page }).withTags(TAGS).exclude("iframe").analyze();
      const found = withoutSearchHint(result.violations);
      for (const v of found) {
        console.log(
          `${where}: ${v.id} (${v.impact}) at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
        console.log(`  ${v.nodes[0].failureSummary?.split("\n").slice(1).join(" ").trim()}`);
      }
      violations += found.length;
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
// Reflow at the narrowest width WCAG names (320px) with text at 200%. bypassCSP lets the
// injected font-size style past the page's style-src.
{
  const page = await (
    await browser.newContext({ viewport: { width: 320, height: 700 }, bypassCSP: true })
  ).newPage();
  for (const path of pages) {
    await page.goto(new URL(path, root).href);
    if (path === "") {
      const targets = await page
        .locator(".flow svg:visible .flow-hit")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      if (targets.some((height) => height < 24))
        fail("320px: a Fig. 1 label has a hit area under 24px");
    }
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
  for (const v of withoutSearchHint(open.violations))
    fail(`${name}: with the filter panel open, ${v.id}`);
  await trigger.focus();
  await page.keyboard.press("Escape");
  if ((await trigger.getAttribute("aria-expanded")) !== "false")
    fail(`${name}: Escape on the filter button left the panel open`);
  await trigger.click();
  await page.getByRole("button", { name: "Computer vision", exact: true }).click();
  await page.getByRole("button", { name: "Remove filter: Computer vision" }).click();
  if (await page.evaluate(() => document.activeElement === document.body))
    fail(`${name}: removing a filter dropped focus to the page`);
  const paper = "kumarLargeLanguageModelbased2025";
  await page.goto(new URL(`literature/?papers=${paper}`, root).href);
  await page.waitForFunction(() => document.querySelectorAll(".lit-entry").length === 1);
  const downloadEvent = page.waitForEvent("download");
  await page.locator(".lit-export").getByRole("button", { name: "BibTeX" }).click();
  const download = await downloadEvent;
  const bibtex = await readFile(await download.path(), "utf8");
  if (
    download.suggestedFilename() !== "ai4ie-literature.bib" ||
    !bibtex.startsWith("@") ||
    bibtex.match(/^@\w+\{/gm)?.length !== 1 ||
    !bibtex.includes(paper)
  )
    fail(`${name}: the filtered BibTeX download is missing its citation`);

  await page.goto(new URL("applications-map/", root).href, { waitUntil: "networkidle" });
  const extra = await page.$eval(".apx-grid-wrap", (w) => w.scrollWidth - w.offsetWidth);
  const table = await page.$eval(".apx-grid", (t) => t.offsetWidth);
  const wrap = await page.$eval(".apx-grid-wrap", (w) => w.offsetWidth);
  if (extra > Math.max(0, table - wrap) + 1)
    fail(`${name}: the map grid scrolls ${extra}px though its table needs ${table - wrap}px`);
  // Fig. 1: keyboard focus on a node lights its bands and names its reach in
  // the live readout, the same as pointing at it; leaving restores both.
  await page.goto(root);
  await page.evaluate(() => document.fonts.ready);
  const clippedLabels = await page.locator(".flow svg:visible text").evaluateAll((labels) =>
    labels
      .filter((label) => {
        const { left, right } = label.getBoundingClientRect();
        return left < 0 || right > innerWidth;
      })
      .map((label) => label.textContent),
  );
  if (clippedLabels.length) fail(`${name}: clipped Fig. 1 labels: ${clippedLabels.join(", ")}`);
  const readout = page.locator(".flow-readout");
  const idle = await readout.textContent();
  const node = page.locator(".flow svg:visible .flow-node").first();
  await node.focus();
  const lit = await page.locator(".flow .band.lit").count();
  if (lit === 0 || (await readout.textContent()) === idle)
    fail(`${name}: focusing a Fig. 1 node did not light its bands or update the readout`);
  if ((await readout.getAttribute("aria-live")) !== "polite")
    fail(`${name}: the Fig. 1 readout is not a polite live region`);
  await node.blur();
  if ((await readout.textContent()) !== idle || (await page.locator(".flow .band.lit").count()))
    fail(`${name}: leaving a Fig. 1 node left it lit`);

  await page.route("**/api/search", (route) => route.fulfill({ json: { hits: [] } }));
  await page.locator("site-search button[data-open-modal]").click();
  const query = "what papers map buildings";
  const searchInput = page.locator(".pagefind-ui__search-input");
  await searchInput.fill(query);
  const suggest = page.locator(".ss-gap a");
  await suggest.waitFor();
  const suggestionUrl = new URL(await suggest.getAttribute("href"), root);
  if (
    suggestionUrl.searchParams.has("gap") ||
    suggestionUrl.href.includes(encodeURIComponent(query))
  )
    fail(`${name}: the GitHub suggestion link includes the search query`);

  const results = page.locator(".ss-results");
  await results.evaluate((list) => {
    new MutationObserver(() => {
      if (list.childElementCount) list.dataset.unexpectedHit = "true";
    }).observe(list, { childList: true });
  });
  await page.unroute("**/api/search");
  await page.route("**/api/search", async (route) => {
    await searchInput.fill("metal");
    await route.fulfill({
      json: {
        hits: [{ href: "/literature/", title: "Test paper", year: 2026, blurb: "Test result" }],
      },
    });
  });
  await searchInput.fill("what papers sort waste");
  await suggest.waitFor({ state: "hidden" });
  if (await results.getAttribute("data-unexpected-hit"))
    fail(`${name}: a previous search result appeared after the query changed`);

  // Each way /api/search can fail shows its own status line.
  for (const [n, answer, said] of [
    [1, (route) => route.fulfill({ status: 429 }), "Too many searches"],
    [2, (route) => route.fulfill({ status: 503 }), "Paper search is unavailable"],
    [3, (route) => route.abort(), "Paper search did not respond"],
  ]) {
    await page.unroute("**/api/search");
    await page.route("**/api/search", answer);
    await searchInput.fill(`which papers sort waste ${n}`);
    const shown = await page
      .waitForFunction(
        (t) => document.querySelector(".ss-status")?.textContent?.startsWith(t),
        said,
        {
          timeout: 5000,
        },
      )
      .then(
        () => true,
        () => false,
      );
    if (!shown) fail(`${name}: a failed paper search did not say "${said}"`);
  }
}

await browser.close();
for (const [key, n] of incomplete) console.log(`not decided by axe: ${key} (${n} node(s))`);
console.log(
  `axe: ${pages.length} page(s) × 2 colour schemes × 2 widths, ${violations} violation(s).`,
);
process.exit(violations ? 1 : 0);
