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
 * It also writes src/data/literature-map-vectors.json, the literature map's input: each paper's
 * title and abstract, the abstract fetched live from OpenAlex (its summary stands in when
 * OpenAlex has none), so the map places a paper by its own text, not by the tags that colour it.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (scripts/lib/workers-ai.mjs).
 */

import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { EMBED_MODEL, entryText } from "../src/lib/semantic.ts";
import {
  embedMissing,
  loadVectors,
  MAP_VECTORS_FILE,
  textKey,
  VECTORS_FILE,
} from "../src/lib/vectors.ts";
import { abstractText, entryDoi, worksByDoi } from "./lib/openalex.mjs";
import { embed } from "./lib/workers-ai.mjs";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const texts = entries.map(entryText);
const out = { model: EMBED_MODEL, vectors: await embedMissing(texts, embed) };
await writeFile(VECTORS_FILE, `${JSON.stringify(out)}\n`);
console.log(`embedded ${texts.length} entries into ${VECTORS_FILE}`);

const works = await worksByDoi(
  entries.flatMap((e) => entryDoi(e) ?? []),
  "doi,abstract_inverted_index",
);
const mapTexts = entries.map(
  (e) =>
    `${e.title}\n\n${abstractText(works.get(entryDoi(e) ?? "")?.abstract_inverted_index) || e.blurb}`,
);
const mapOut = {
  model: EMBED_MODEL,
  keys: Object.fromEntries(entries.map((e, i) => [e.id, textKey(mapTexts[i])])),
  vectors: await embedMissing(mapTexts, embed, loadVectors(MAP_VECTORS_FILE)),
};
await writeFile(MAP_VECTORS_FILE, `${JSON.stringify(mapOut)}\n`);
const fallback = mapTexts.filter((t, i) => t.endsWith(entries[i].blurb)).length;
console.log(`embedded ${mapTexts.length} map texts (${fallback} without an abstract)`);
