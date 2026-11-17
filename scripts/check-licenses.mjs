#!/usr/bin/env node
/**
 * Lists the licences of the production dependencies and exits 1 on one that is not
 * allowed. The site's code is MIT and its content CC BY 4.0, so permissive licences
 * and file-level copyleft (MPL) pass; a strong copyleft licence needs a decision.
 *
 *   pnpm run licenses
 */

import { execFileSync } from "node:child_process";
import process from "node:process";

const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT OR Apache-2.0",
  "MPL-2.0",
  "OFL-1.1", // the self-hosted variable fonts
  "Python-2.0", // argparse
]);
// sharp-libvips (one package per platform) is a build-time image library, linked
// dynamically and not part of the built site, so its LGPL does not reach the output.
function isSharpLibvips(name, licence) {
  return name.startsWith("@img/sharp-libvips-") && licence === "LGPL-3.0-or-later";
}

const byLicence = JSON.parse(
  execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);

let bad = 0;
for (const [licence, packages] of Object.entries(byLicence)) {
  console.log(`${licence}: ${packages.length}`);
  for (const { name } of packages) {
    if (ALLOWED.has(licence) || isSharpLibvips(name, licence)) continue;
    console.error(`  ${name} is ${licence}, which is not on the allowed list`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
