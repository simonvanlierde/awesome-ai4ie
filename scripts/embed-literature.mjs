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

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { EMBED_MODEL, entryText } from "../src/lib/semantic.ts";
import { embedMissing, MAP_VECTORS_FILE, textKey, VECTORS_FILE } from "../src/lib/vectors.ts";
import { abstractText, entryDoi, worksByDoi } from "./lib/openalex.mjs";
import { embed } from "./lib/workers-ai.mjs";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const texts = entries.map(entryText);
const out = { model: EMBED_MODEL, vectors: await embedMissing(texts, embed) };
await writeFile(VECTORS_FILE, `${JSON.stringify(out)}\n`);
console.log(`embedded ${texts.length} entries into ${VECTORS_FILE}`);

// Only papers without a cached map vector go to OpenAlex: its API runs on a daily budget, and a
// build should not depend on it. A paper's source key is its title plus the abstract hash in
// literature-meta.json (or its summary), so an edited title or a new abstract re-embeds it.
const meta = JSON.parse(await readFile("src/data/literature-meta.json", "utf8"));
const prev = existsSync(MAP_VECTORS_FILE)
  ? JSON.parse(await readFile(MAP_VECTORS_FILE, "utf8"))
  : {};
const cache =
  prev.model === EMBED_MODEL && prev.sources ? prev : { keys: {}, sources: {}, vectors: {} };
function source(e) {
  return textKey(`${e.title}\n\n${meta[e.id]?.abstract ?? e.blurb}`);
}
function cached(e) {
  return cache.sources[e.id] === source(e) && cache.vectors[cache.keys[e.id]];
}
const todo = entries.filter((e) => !cached(e));
const dois = todo.flatMap((e) => (meta[e.id]?.abstract && entryDoi(e)) || []);
// When OpenAlex fails, these papers use their summary this run and are retried on the next.
const works = dois.length
  ? await worksByDoi(dois, "doi,abstract_inverted_index").catch((err) => {
      console.log(`::warning::map vectors fall back to summaries: ${err.message.slice(0, 200)}`);
      return null;
    })
  : new Map();
const todoTexts = todo.map(
  (e) =>
    `${e.title}\n\n${abstractText(works?.get(entryDoi(e) ?? "")?.abstract_inverted_index) || e.blurb}`,
);
const fresh = await embedMissing(todoTexts, embed, {});
const mapOut = { model: EMBED_MODEL, keys: {}, sources: {}, vectors: {} };
for (const e of entries) {
  const i = todo.indexOf(e);
  const key = i < 0 ? cache.keys[e.id] : textKey(todoTexts[i]);
  mapOut.keys[e.id] = key;
  mapOut.sources[e.id] = works || i < 0 || !meta[e.id]?.abstract ? source(e) : null;
  mapOut.vectors[key] = i < 0 ? cache.vectors[key] : fresh[key];
}
await writeFile(MAP_VECTORS_FILE, `${JSON.stringify(mapOut)}\n`);
console.log(
  `map vectors: ${entries.length - todo.length} cached, ${todo.length} embedded (${dois.length} abstracts asked for)`,
);
