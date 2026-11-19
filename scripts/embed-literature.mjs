#!/usr/bin/env node
/**
 * Embeds every literature.yaml entry for meaning search and writes
 * src/data/literature-vectors.json, which the build ships in literature-index.json.
 * The browser then embeds only the question, not the 100-odd entries (about 11 s
 * on a phone-speed CPU). Without the file, or for an entry edited since, the
 * browser embeds the entry itself, so a skipped or failed run changes speed only.
 *
 *   pnpm run embed    # before `pnpm run build`; downloads ~30 MB once
 *
 * Needs a Chromium for Playwright: `pnpm exec playwright install chromium`.
 */

import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { entryText, MODEL_REVISION } from "../src/lib/semantic.ts";
import { encodeVector, textKey, VECTORS_FILE } from "../src/lib/vectors.ts";
import { embedInChromium } from "./lib/embed-in-chromium.mjs";

const texts = parse(await readFile("src/data/literature.yaml", "utf8")).map(entryText);
const [vectors] = await embedInChromium(texts);
const out = {
  revision: MODEL_REVISION,
  vectors: Object.fromEntries(texts.map((t, i) => [textKey(t), encodeVector(vectors[i])])),
};
await writeFile(VECTORS_FILE, `${JSON.stringify(out)}\n`);
console.log(`embedded ${texts.length} entries into ${VECTORS_FILE}`);
