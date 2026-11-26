/**
 * Fill the footprint page's `%%fp:name%%` tokens from the built site's page weights.
 * Runs at `astro:build:done`, before Pagefind indexes the pages, so the numbers come from
 * this build and cannot go stale.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { weighAll } from "../../scripts/page-weight.mjs";
import { fillTokens, footprint, footprintTokens } from "../lib/footprint.mjs";

const PAGE = "footprint/index.html";

export function footprintNumbers() {
  return {
    name: "footprint-numbers",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const file = `${fileURLToPath(dir)}/${PAGE}`;
        const html = await readFile(file, "utf8");
        const tokens = footprintTokens(footprint(await weighAll()));
        await writeFile(file, fillTokens(html, tokens));
      },
    },
  };
}
