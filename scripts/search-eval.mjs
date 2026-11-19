#!/usr/bin/env node
/**
 * Scores the search dialog's meaning search on src/data/search-eval.yaml. It runs the
 * site's Workers AI model through the REST API and ranks with the site's own rank(). It prints the misses, each question's best score and
 * its first right answer, so the cut-off in src/lib/semantic.ts can be tuned.
 * Exits 1 when an off-list question shows a paper, or an in-list one shows only
 * wrong ones.
 *
 *   pnpm run search-eval
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (scripts/lib/workers-ai.mjs).
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
import { parse } from "yaml";
import { entryText, queryText, rank } from "../src/lib/semantic.ts";
import { embed } from "./lib/workers-ai.mjs";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const questions = parse(await readFile("src/data/search-eval.yaml", "utf8"));
const texts = entries.map(entryText);
const vectors = await embed(texts);
const queryVectors = await embed(questions.map((q) => queryText(q.q)));

let found = 0;
let failed = 0;
const inList = questions.filter((q) => q.expect.length).length;
questions.forEach((q, i) => {
  const shown = rank(queryVectors[i], vectors).map((k) => entries[k].id);
  const scored = vectors
    .map((v, k) => ({ id: entries[k].id, s: v.reduce((a, x, j) => a + x * queryVectors[i][j], 0) }))
    .sort((a, b) => b.s - a.s);
  const right = scored.findIndex((h) => q.expect.includes(h.id));
  const best = scored[0].s.toFixed(3);
  if (!q.expect.length) {
    if (shown.length) {
      failed++;
      console.log(`LEAK  ${best}  ${q.q}  ->  ${shown.join(", ")}`);
    } else console.log(`ok    ${best}  ${q.q}  (off-list)`);
    return;
  }
  const hit = shown.some((id) => q.expect.includes(id));
  if (hit) found++;
  else if (shown.length) failed++;
  const where = right < 0 ? "none" : `#${right + 1} at ${scored[right].s.toFixed(3)}`;
  const tag = hit ? "ok   " : shown.length ? "WRONG" : "miss ";
  console.log(`${tag} ${best}  ${q.q}  (right answer ${where})`);
});
console.log(
  `\nfound ${found}/${inList} in-list questions; ${failed} off-list leak(s) or wrong-only answer(s)`,
);
process.exit(failed ? 1 : 0);
