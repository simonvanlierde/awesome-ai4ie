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
        const root = fileURLToPath(dir);
        try {
          const html = await readFile(`${root}/${PAGE}`, "utf8");
          const tokens = footprintTokens(footprint(await weighAll(root)));
          await writeFile(`${root}/${PAGE}`, fillTokens(html, tokens));
        } catch (e) {
          throw new Error(`footprint page: ${e.message}`, { cause: e });
        }
      },
    },
  };
}
