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
import { embedMissing, MAP_VECTORS_FILE, VECTORS_FILE } from "../src/lib/vectors.ts";
import { mapPlan, mapTodo } from "./lib/map-plan.mjs";
import { worksByDoi } from "./lib/openalex.mjs";
import { embed } from "./lib/workers-ai.mjs";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const texts = entries.map(entryText);
const out = { model: EMBED_MODEL, vectors: await embedMissing(texts, embed) };
await writeFile(VECTORS_FILE, `${JSON.stringify(out)}\n`);
console.log(`embedded ${texts.length} entries into ${VECTORS_FILE}`);

// Only papers without a cached map vector go to OpenAlex (scripts/lib/map-plan.mjs): its API
// runs on a daily budget, and a build should not depend on it.
const meta = JSON.parse(await readFile("src/data/literature-meta.json", "utf8"));
const prev = existsSync(MAP_VECTORS_FILE)
  ? JSON.parse(await readFile(MAP_VECTORS_FILE, "utf8"))
  : {};
const cache =
  prev.model === EMBED_MODEL && prev.sources ? prev : { keys: {}, sources: {}, vectors: {} };
const { todo, dois } = mapTodo(entries, meta, cache);
// When OpenAlex fails, these papers use their summary this run and are retried on the next.
const works = dois.length
  ? await worksByDoi(dois, "doi,abstract_inverted_index").catch((err) => {
      console.log(`::warning::map vectors fall back to summaries: ${err.message.slice(0, 200)}`);
      return null;
    })
  : new Map();
const plan = mapPlan(entries, meta, cache, works);
// The cache is the store, so a retried paper whose text did not change is not embedded again.
const fresh = await embedMissing(plan.texts, embed, cache.vectors);
const vectors = Object.fromEntries(
  Object.values(plan.keys).map((k) => [k, fresh[k] ?? cache.vectors[k]]),
);
const mapOut = { model: EMBED_MODEL, keys: plan.keys, sources: plan.sources, vectors };
await writeFile(MAP_VECTORS_FILE, `${JSON.stringify(mapOut)}\n`);
console.log(
  `map vectors: ${entries.length - todo.length} cached, ${todo.length} embedded (${dois.length} abstracts asked for, ${Object.values(mapOut.sources).filter((v) => v === null).length} fell back to the summary)`,
);
