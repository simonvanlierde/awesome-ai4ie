/**
 * Add the hashes of a page's own inline scripts to its Content-Security-Policy.
 *
 * Astro's `security.csp` hashes the scripts it renders, but not the `is:inline` ones that
 * Starlight writes (the theme provider and the search button). The policy then blocks them,
 * and the theme toggle and search stop working. This reads the built pages and lists every
 * inline script, so a Starlight update that changes one needs no manual hash.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const META = /(<meta http-equiv="content-security-policy" content=")([^"]*)(")/;
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

/** `html` with every inline script's hash in the `script-src` of its CSP meta tag. */
export function addInlineScriptHashes(html) {
  const meta = META.exec(html);
  if (!meta) return html;
  const hashes = [...html.matchAll(INLINE_SCRIPT)]
    .map(([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`)
    .filter((hash) => !meta[2].includes(hash));
  if (!hashes.length) return html;
  const policy = meta[2].replace(/(script-src [^;]*)/, `$1 ${[...new Set(hashes)].join(" ")}`);
  return html.replace(META, (_, open, __, close) => open + policy + close);
}

export function cspInlineScripts() {
  return {
    name: "csp-inline-scripts",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = fileURLToPath(dir);
        for (const file of await readdir(root, { recursive: true })) {
          if (!file.endsWith(".html")) continue;
          const html = await readFile(`${root}/${file}`, "utf8");
          const fixed = addInlineScriptHashes(html);
          if (fixed !== html) await writeFile(`${root}/${file}`, fixed);
        }
      },
    },
  };
}
