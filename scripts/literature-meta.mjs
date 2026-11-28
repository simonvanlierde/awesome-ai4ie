#!/usr/bin/env node
/**
 * Records, for each literature.yaml entry with a DOI or arXiv id, its OpenAlex work id, primary
 * topic and a sha256 of its abstract in src/data/literature-meta.json. The map colours papers
 * by that topic. The abstract text is never stored (publisher copyright); `pnpm run embed`
 * fetches it live. OpenAlex data is CC0 (https://openalex.org/about). Keys are sorted, so a
 * rerun with unchanged data leaves the file byte-identical.
 *
 *   pnpm run literature-meta
 *
 * OPENALEX_API_KEY is optional (scripts/lib/openalex.mjs).
 */
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { entryDoi, metaRow, worksByDoi } from "./lib/openalex.mjs";

const META = new URL("../src/data/literature-meta.json", import.meta.url);
const prev = JSON.parse(await readFile(META, "utf8").catch(() => "{}"));
const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const dois = entries.flatMap((e) => entryDoi(e) ?? []);
const works = await worksByDoi(dois, "id,doi,primary_topic,abstract_inverted_index");
// A work OpenAlex did not return this run keeps its previous row, so a gap does not drop it.
const kept = [];
const missing = [];
const rows = entries.flatMap((e) => {
  const work = works.get(entryDoi(e) ?? "");
  if (work) return [[e.id, metaRow(work)]];
  if (!entryDoi(e)) return [];
  (prev[e.id] ? kept : missing).push(e.id);
  return prev[e.id] ? [[e.id, prev[e.id]]] : [];
});
rows.sort(([a], [b]) => (a < b ? -1 : 1));
await writeFile(META, `${JSON.stringify(Object.fromEntries(rows), null, 2)}\n`);
console.log(`${rows.length - kept.length} of ${entries.length} entries found on OpenAlex`);
if (kept.length) console.log(`kept the previous row for ${kept.length}: ${kept.join(", ")}`);
if (missing.length) console.log(`no row for ${missing.length}: ${missing.join(", ")}`);
