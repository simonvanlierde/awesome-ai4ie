#!/usr/bin/env node
/**
 * Renders the social card (public/og.png, 1200×630) from the built home page: the site glyph, the
 * title, one line saying what the site is, the address, and Fig. 1 below.
 * Rerun it when the title, the site description or Fig. 1's counts change, then commit the PNG.
 *
 *   pnpm run build && pnpm exec astro preview &
 *   pnpm run og-card                        # defaults to localhost:4321 at the base path
 *
 * Needs a Chromium for Playwright: `pnpm exec playwright install chromium`.
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { basePath, site } from "../src/site.ts";

const root = process.argv[2] ?? `http://localhost:4321${basePath}/`;
const address = `${site}${basePath}`.replace(/^https:\/\//, "");
// The site description (README's opening sentence); the card makes no claim of its own.
const LINE = "A community-curated guide to using AI in industrial ecology";
// The favicon: the wordmark's pivot glyph (a 4 within the Æ) on the cobalt square.
const glyph = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");

// Name, line and address stay inside the centred 630 px (x 285-915) so a square crop keeps
// them; Fig. 1 runs the full card width below them.
const CARD_CSS = `
  html, body { margin: 0; background: #f7f7f5; }
  #og { position: relative; width: 1200px; height: 630px; overflow: hidden; color: #16181d; }
  #og .col { position: absolute; left: 285px; width: 630px; }
  #og .glyph { top: 44px; left: 779px; width: 136px; height: 136px; }
  #og .glyph svg { width: 136px; height: 136px; display: block; border-radius: 26px; }
  #og .url { top: 300px; width: auto; font: 600 30px/1 var(--sl-font); color: #2b2b2b; }
  #og h1 { position: absolute; left: 285px; top: 38px; width: 630px; margin: 0; font-size: 70px; line-height: 0.98; letter-spacing: -0.01em; }
  #og .line { top: 186px; margin: 0; font: 500 40px/1.22 var(--font-read, serif); text-wrap: balance; }
  #og .flow { position: absolute; left: 0; top: 362px; width: 1200px; height: 268px; margin: 0; }
  #og .flow svg { width: 1200px; height: 268px; overflow: visible; }
  #og .flow text { font-size: 26px; }
`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  colorScheme: "light",
});
await page.goto(root, { waitUntil: "networkidle" });
await page.addStyleTag({ content: CARD_CSS });
await page.evaluate(
  ({ glyphSvg, text, host }) => {
    const h1 = document.querySelector(".cover h1#_top");
    const flow = document.querySelector(".flow");
    const card = document.createElement("div");
    card.id = "og";
    card.innerHTML = `<div class="col glyph">${glyphSvg}</div><div class="col url">${host}</div>
      <p class="col line">${text}</p>`;
    card.append(h1, flow);
    document.body.replaceChildren(card);
    document.querySelectorAll("#og .flow figcaption, #og .flow-hit").forEach((el) => {
      el.remove();
    });

    // Stretch the figure from its 778×420 box to the card: bands run long, labels keep their size.
    const svg = flow.querySelector("svg");
    svg.setAttribute("viewBox", "0 0 1200 268");
    svg.removeAttribute("width");
    const [X0, X1, SY, LEFT, RIGHT] = [208, 480, 268 / 420, 215, 940];
    const sx = (RIGHT - LEFT) / (X1 - X0);
    const bands = svg.querySelector(".flow-bands");
    bands.setAttribute("transform", `translate(${LEFT - X0 * sx} 0) scale(${sx} ${SY})`);
    for (const r of svg.querySelectorAll("rect.node")) {
      const x = +r.getAttribute("x");
      r.setAttribute("x", x < X0 ? LEFT - 8 : RIGHT);
      r.setAttribute("y", +r.getAttribute("y") * SY);
      r.setAttribute("height", +r.getAttribute("height") * SY);
    }
    // Labels are 26 px: only the largest right-hand nodes keep one, so they stay clear of each other.
    const KEEP = ["Computer vision", "Tabular ML", "LLMs", "Detection", "Remote sensing"];
    for (const t of svg.querySelectorAll("text")) {
      if (
        t.getAttribute("text-anchor") !== "end" &&
        !KEEP.some((k) => t.textContent.startsWith(k))
      ) {
        t.remove();
        continue;
      }
      const left = t.getAttribute("text-anchor") === "end";
      t.setAttribute("x", left ? LEFT - 18 : RIGHT + 18);
      t.setAttribute("y", +t.getAttribute("y") * SY);
    }
  },
  { glyphSvg: glyph, text: LINE, host: address },
);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log("wrote public/og.png");
