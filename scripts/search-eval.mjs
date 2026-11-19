#!/usr/bin/env node
/**
 * Scores the search dialog's meaning search on src/data/search-eval.yaml. It runs the
 * site's Workers AI model through the REST API and ranks with the site's own rank(). It prints the misses, each question's best score and
 * its first right answer, so the cut-off in src/lib/semantic.ts can be tuned on the
 * tuning half of the questions. Entry vectors come from the shipped vectors file (run
 * `pnpm run embed` first); only the questions are embedded. Exits 1 when an off-list
 * question shows a paper, an in-list one shows only wrong ones, or the held-out
 * half (isHeldOut in scripts/lib/eval-metrics.mjs) falls below the hit@1 or MRR floor in scripts/lib/eval-metrics.mjs.
 *
 *   pnpm run search-eval
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (scripts/lib/workers-ai.mjs).
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
import { parse } from "yaml";
import { decodeVector, entryText, queryText, rank, scores } from "../src/lib/semantic.ts";
import { loadVectors, textKey } from "../src/lib/vectors.ts";
import { formatScore, HIT1_MIN, isHeldOut, MRR_MIN, summarize } from "./lib/eval-metrics.mjs";
import { embed } from "./lib/workers-ai.mjs";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const questions = parse(await readFile("src/data/search-eval.yaml", "utf8"));
const stored = loadVectors();
const vectors = entries.map((e) => {
  const v = stored[textKey(entryText(e))];
  if (!v) throw new Error(`no vector for ${e.id}: run pnpm run embed first`);
  return decodeVector(v);
});
const queryVectors = await embed(questions.map((q) => queryText(q.q)));

const rows = [];
let found = 0;
let failed = 0;
const inList = questions.filter((q) => q.expect.length).length;
questions.forEach((q, i) => {
  const shown = rank(queryVectors[i], vectors).map((k) => entries[k].id);
  const scored = scores(queryVectors[i], vectors)
    .map((s, k) => ({ id: entries[k].id, s }))
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
  rows.push({ expect: q.expect, shown, heldOut: isHeldOut(q.q) });
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
const held = summarize(rows.filter((r) => r.heldOut));
const tuned = summarize(rows.filter((r) => !r.heldOut));
console.log(`tuning:   ${formatScore(tuned)}\nheld-out: ${formatScore(held)}`);
const dropped = held.hit1 < HIT1_MIN || held.mrr < MRR_MIN;
if (dropped) console.log(`held-out below floor: hit@1 ${HIT1_MIN}, MRR ${MRR_MIN}`);
process.exit(failed || dropped ? 1 : 0);
