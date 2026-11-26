#!/usr/bin/env node
/**
 * Lists every figure the site attributes to a paper: each stretch of page text that
 * carries a number and ends in a `<Cite>`, each numbered blurb in literature.yaml, and
 * each numbered summary or maturity line in applications.yaml (checked against its papers). These are the claims to check against the
 * paper itself, since a source can exist and still not say what the page says. A
 * claim is the text between two Cites, so a row can carry a neighbour's number.
 *
 * With --notes <dir>, a folder of reading notes (`@<citekey>.md`, found by the entry's DOI or arXiv
 * id, else by its id), it lists only the numbers that the note's
 * `%% begin obsidian notes %%` block never mentions, exactly or rounded: the figures
 * nobody has checked yet. Prints one tab-separated row per claim: id, file, unchecked
 * numbers, claim.
 *
 *   pnpm run cited-figures [--notes <dir>]
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { parse } from "yaml";

const CONTENT = "src/content";
const CITE = /<Cite id="([^"]+)"[^>]*?(?:\/>|>[\s\S]*?<\/Cite>)/g;
const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?/g;
const BLOCK = /%% begin obsidian notes %%([\s\S]*?)%% end obsidian notes %%/g;
const PARAGRAPH = /\n\s*\n/;
const LINK_TARGET = /\]\([^)]*\)/g;
const TAG = /<[^>]+>/g;
const SPACE = /\s+/g;
const LEADING = /^[\s.,;)]+/;
const DOI = /^doi: "?([^"\n]+)"?$/m;
const ARXIV = /^url: \S*arxiv\.org\/abs\/(\d{4}\.\d{4,5})/m;
const PAGE = /\.mdx?$/;

/** The numbers in `text`, with thousands separators dropped: "1,456" and "1456" are one figure. */
function numbersIn(text) {
  return (text.match(NUMBER) ?? []).map((n) => n.replaceAll(",", ""));
}

/** The claims in one page: the text before each Cite, back to the previous Cite or the paragraph start. */
export function citedFigures(text) {
  const out = [];
  for (const para of text.split(PARAGRAPH)) {
    let start = 0;
    for (const m of para.matchAll(CITE)) {
      const claim = para
        .slice(start, m.index)
        .replace(LINK_TARGET, "]") // link targets: DOIs carry digits
        .replace(TAG, "")
        .replace(SPACE, " ")
        .replace(LEADING, "")
        .trim();
      start = m.index + m[0].length;
      const numbers = numbersIn(claim);
      if (numbers.length) out.push({ id: m[1], claim, numbers });
    }
  }
  return out;
}

/** `value` rounded to as many decimals as `shown` has, so 0.855 matches a page's "0.86". */
function roundsTo(value, shown) {
  if (value === shown) return true;
  const decimals = shown.split(".")[1]?.length ?? 0;
  const scale = 10 ** decimals;
  // The epsilon undoes binary float error: 0.855 * 100 is 85.4999…
  return (Math.round(Number(value) * scale + 1e-9) / scale).toFixed(decimals) === shown;
}

/** The numbers that no reading-notes block in `notes` mentions, exactly or rounded. */
export function unchecked(numbers, notes) {
  const inNote = [...notes.matchAll(BLOCK)].flatMap((m) => numbersIn(m[1]));
  return numbers.filter((n) => !inNote.some((v) => roundsTo(v, n)));
}

/** Reading notes keyed by citekey and by lower-case DOI: site ids are not always Zotero's citekeys. */
async function readNotes(dir) {
  const notes = new Map();
  for (const file of await readdir(dir)) {
    if (!file.startsWith("@") || !file.endsWith(".md")) continue;
    const text = await readFile(join(dir, file), "utf8");
    notes.set(file.slice(1, -3), text);
    const doi = text.match(DOI)?.[1];
    if (doi) notes.set(doi.toLowerCase(), text);
    // Zotero keeps an arXiv preprint's id in its URL; the site cites it by DataCite DOI.
    const arxiv = text.match(ARXIV)?.[1];
    if (arxiv) notes.set(`10.48550/arxiv.${arxiv}`, text);
  }
  return notes;
}

/** Numbered claims in the data files: a paper's blurb, and an application's text checked against its papers. */
async function dataClaims() {
  const claims = [];
  for (const [path, ids, text] of [
    ["src/data/literature.yaml", (e) => [e.id], (e) => e.blurb],
    ["src/data/applications.yaml", (e) => e.papers ?? [], (e) => `${e.summary} ${e.maturity}`],
  ]) {
    for (const e of parse(await readFile(path, "utf8"))) {
      const numbers = numbersIn(text(e) ?? "");
      if (numbers.length) claims.push({ ids: ids(e), path, claim: text(e), numbers });
    }
  }
  return claims;
}

async function main() {
  const i = process.argv.indexOf("--notes");
  if (i > 0 && !process.argv[i + 1]) throw new Error("--notes needs a folder");
  const notes = i > 0 ? await readNotes(process.argv[i + 1]) : undefined;
  const dois = new Map(
    parse(await readFile("src/data/literature.yaml", "utf8")).map((e) => [
      e.id,
      e.doi?.toLowerCase(),
    ]),
  );
  const claims = [];
  const files = (await readdir(CONTENT, { recursive: true })).filter((f) => PAGE.test(f)).sort();
  for (const file of files) {
    const path = join(CONTENT, file);
    for (const { id, ...rest } of citedFigures(await readFile(path, "utf8")))
      claims.push({ ids: [id], path, ...rest });
  }
  claims.push(...(await dataClaims()));
  for (const { ids, path, claim, numbers } of claims) {
    const text = ids.map((id) => notes?.get(dois.get(id)) ?? notes?.get(id) ?? "").join("\n");
    const todo = notes ? unchecked(numbers, text) : numbers;
    if (todo.length) console.log([ids.join(","), path, todo.join(" "), claim].join("\t"));
  }
}

if (import.meta.main) await main();
