#!/usr/bin/env node
/**
 * Embeds every literature.yaml entry for meaning search and writes
 * src/data/literature-vectors.json, which the build ships as literature-vectors.bin.
 * Entries whose text and model are unchanged keep the vector already in that file, so an
 * unchanged list makes no embedding call. The site's /api/search Worker then embeds only the question. An entry without a
 * vector (the file is missing, or the entry was edited since) is not searched.
 *
 *   pnpm run embed    # before `pnpm run build`
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (scripts/lib/workers-ai.mjs).
 */

import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { EMBED_MODEL, entryText } from "../src/lib/semantic.ts";
import { embedMissing, VECTORS_FILE } from "../src/lib/vectors.ts";
import { embed } from "./lib/workers-ai.mjs";

const texts = parse(await readFile("src/data/literature.yaml", "utf8")).map(entryText);
const out = { model: EMBED_MODEL, vectors: await embedMissing(texts, embed) };
await writeFile(VECTORS_FILE, `${JSON.stringify(out)}\n`);
console.log(`embedded ${texts.length} entries into ${VECTORS_FILE}`);
