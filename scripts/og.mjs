#!/usr/bin/env node
/**
 * Renders the social card (public/og.png, 1200×630) from the built home cover:
 * the title and Fig. 1, without the site chrome. Rerun it
 * when the cover's title or Fig. 1's counts change, then commit the PNG.
 *
 *   pnpm run build && pnpm exec astro preview &
 *   node scripts/og.mjs                     # defaults to localhost:4321 at the base path
 *
 * Needs a Chromium for Playwright: `pnpm exec playwright install chromium`.
 */

import process from "node:process";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { basePath } from "../src/site.ts";

const root = process.argv[2] ?? `http://localhost:4321${basePath}/`;

// A poster: only the title and Fig. 1 stay, both inside the centred 630 px so a square
// crop keeps them. The running head, tagline and buttons go; they are too small to read in a preview.
const CARD_CSS = `
  header.header, .skip-link, .cover-actions, .chapter-index, .flow figcaption, .running-head,
  .cover-tagline, .colophon, footer, .sl-sr-only, .sl-markdown-content { display: none !important; }
  .page, .main-frame { padding: 0 !important; }
  .main-pane, .content-panel, .sl-container { max-width: none !important; padding: 0 !important; border: 0 !important; }
  .cover { position: relative; width: 1200px; height: 630px; padding: 0 !important; overflow: hidden; }
  .cover-grid, .cover-copy { display: block !important; }
  .cover-copy { position: absolute; left: 285px; top: 52px; width: 630px; }
  .cover-copy h1 { font-size: 84px !important; line-height: 0.98 !important; margin: 0 !important; max-width: none !important; }
  .flow { position: absolute; left: 285px; top: 234px; width: 630px; margin: 0 !important; }
  .flow svg { width: 100% !important; height: auto !important; }
`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  colorScheme: "light",
});
await page.goto(root, { waitUntil: "networkidle" });
await page.addStyleTag({ content: CARD_CSS });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log("wrote public/og.png");
