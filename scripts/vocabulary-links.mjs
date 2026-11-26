#!/usr/bin/env node
/**
 * Checks every Wikidata and OpenAlex link in src/data/vocabulary.yaml against the live
 * services, and prints each beside the label it points at, so a retargeted link shows:
 *
 *   pnpm run vocabulary-links
 *
 * Exits 1 when an item is missing, merged into another (a Wikidata redirect) or deleted.
 * Wikidata merges and deletes items, so a link that was live when it was added can die
 * later; the weekly link check runs this. Live network, so not part of `pnpm test`.
 */
import process from "node:process";
import { pathToFileURL } from "node:url";

const UA = "awesome-ai4ie vocabulary link check (+https://github.com/simonvanlierde/awesome-ai4ie)";
// A hung request fails within this, not at the 10-minute job timeout.
const TIMEOUT_MS = 30_000;
const WIKIDATA = /^https?:\/\/www\.wikidata\.org\/entity\/(Q\d+)$/;
const OPENALEX = /^https:\/\/openalex\.org\/(T\d+)$/;

/** @type {("exactMatch" | "closeMatch" | "broadMatch" | "narrowMatch" | "relatedMatch")[]} */
const MATCHES = ["exactMatch", "closeMatch", "broadMatch", "narrowMatch", "relatedMatch"];

/**
 * Every outside match of the concepts, as rows to check.
 * @param {{ id: string, prefLabel: string, exactMatch?: string[], closeMatch?: string[], broadMatch?: string[], narrowMatch?: string[], relatedMatch?: string[] }[]} concepts
 */
export function links(concepts) {
  return concepts.flatMap((c) =>
    MATCHES.flatMap((rel) =>
      (c[rel] ?? []).map((iri) => ({ id: c.id, label: c.prefLabel, rel, iri })),
    ),
  );
}

/**
 * The label a wbgetentities entity carries, or null when the item is missing or redirects
 * to another (the API then answers with the target's id under the asked-for key).
 */
export function wikidataLabel(qid, entity) {
  if (!entity || "missing" in entity || entity.id !== qid || entity.redirects) return null;
  const names = entity.labels ?? {};
  // Many items keep their English name only as the language-neutral `mul` label.
  return (names.en ?? names.mul)?.value ?? "";
}

async function wikidataLabels(qids) {
  const labels = new Map();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const query = new URLSearchParams({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "labels",
      languages: "en|mul",
      format: "json",
    });
    const res = await fetch(`https://www.wikidata.org/w/api.php?${query}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
    const body = await res.json();
    // One unknown id fails the whole batch with no-such-entity.
    if (body.error) throw new Error(`Wikidata: ${body.error.code}: ${body.error.info}`);
    for (const qid of batch) labels.set(qid, wikidataLabel(qid, body.entities?.[qid]));
  }
  return labels;
}

async function openalexLabel(tid) {
  const res = await fetch(`https://api.openalex.org/topics/${tid}`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OpenAlex answered ${res.status} for ${tid}`);
  const topic = await res.json();
  return topic.id === `https://openalex.org/${tid}` ? topic.display_name : null;
}

async function main() {
  const { readVocabulary } = await import("../src/data/vocabulary.ts");
  const rows = links(readVocabulary());
  const qids = [...new Set(rows.map((r) => r.iri.match(WIKIDATA)?.[1]).filter(Boolean))];
  const wikidata = await wikidataLabels(qids);
  let bad = 0;
  for (const row of rows) {
    const q = row.iri.match(WIKIDATA)?.[1];
    const t = row.iri.match(OPENALEX)?.[1];
    // A link to a source this script does not know is reported, not skipped silently.
    const found = q ? wikidata.get(q) : t ? await openalexLabel(t) : undefined;
    if (found === null) bad++;
    const shown =
      found === null ? "MISSING OR REDIRECTED" : found === undefined ? "NOT CHECKED" : found;
    console.log(`${row.id}\t${row.label}\t${row.rel}\t${row.iri}\t${shown}`);
  }
  console.log(`${rows.length} links, ${bad} dead`);
  process.exitCode = bad ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
