#!/usr/bin/env node
/**
 * Renders the social card (public/og.png, 1200×630) from the built home cover:
 * the running head, title, tagline and Fig. 1, without the site chrome. Rerun it
 * when the cover's copy or Fig. 1's counts change, then commit the PNG.
 *
 *   npm run build && npx astro preview &
 *   node scripts/og.mjs                     # defaults to localhost:4321 at the base path
 *
 * Needs a Chromium for Playwright: `npx playwright install chromium`.
 */

import process from "node:process";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { basePath } from "../src/site.ts";

const root = process.argv[2] ?? `http://localhost:4321${basePath}/`;

// Everything but the cover goes; the cover fills the card with a 64px margin.
const CARD_CSS = `
  header.header, .skip-link, .cover-actions, .chapter-index, .flow figcaption,
  .colophon, footer, .sl-sr-only, .sl-markdown-content { display: none !important; }
  .running-glyph { min-width: 32px !important; height: 32px !important; }
  .running-glyph .glyph { width: 22px !important; height: 22px !important; }
  .page, .main-frame { padding: 0 !important; }
  .main-pane, .content-panel, .sl-container { max-width: none !important; padding: 0 !important; border: 0 !important; }
  .cover { padding: 56px 64px 0 !important; width: 1200px; box-sizing: border-box; }
  .cover-grid { grid-template-columns: minmax(0, 6fr) minmax(0, 7fr) !important; gap: 48px !important; align-items: center !important; }
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
