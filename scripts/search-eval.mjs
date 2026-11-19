#!/usr/bin/env node
/**
 * Scores the search dialog's meaning search on src/data/search-eval.yaml. It runs the
 * same model, revision and transformers.js build as the site, in Chromium, and ranks
 * with the site's own rank(). It prints the misses, each question's best score and
 * its first right answer, so the cut-offs in src/lib/semantic.ts can be tuned.
 * Exits 1 when an off-list question shows a paper, or an in-list one shows only
 * wrong ones.
 *
 *   pnpm run search-eval    # downloads ~30 MB from jsDelivr and Hugging Face once
 *
 * Needs a Chromium for Playwright: `pnpm exec playwright install chromium`.
 */

import { readFile } from "node:fs/promises";
import process from "node:process";
// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { parse } from "yaml";
import { DTYPE, entryText, MODEL, MODEL_REVISION, rank, stems } from "../src/lib/semantic.ts";
import { TRANSFORMERS_URL } from "../src/lib/transformers.ts";

const entries = parse(await readFile("src/data/literature.yaml", "utf8"));
const questions = parse(await readFile("src/data/search-eval.yaml", "utf8"));
const texts = entries.map(entryText);

// A made-up https origin gives the page a secure context, so the model cache works.
const ORIGIN = "https://search-eval.invalid/";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route(ORIGIN, (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html>" }));
await page.goto(ORIGIN);
const [vectors, queryVectors] = await page.evaluate(
  async ({ url, model, revision, dtype, docs, qs }) => {
    const { pipeline } = await import(url);
    const pipe = await pipeline("feature-extraction", model, { revision, dtype });
    // biome-ignore lint/correctness/useQwikValidLexicalScope: runs inside the page via Playwright, not Qwik
    const embed = async (t) => (await pipe(t, { pooling: "mean", normalize: true })).tolist();
    return [await embed(docs), await embed(qs)];
  },
  {
    url: TRANSFORMERS_URL,
    model: MODEL,
    revision: MODEL_REVISION,
    dtype: DTYPE,
    docs: texts,
    qs: questions.map((q) => q.q),
  },
);
await browser.close();

const entryStems = texts.map(stems);
let found = 0;
let failed = 0;
const inList = questions.filter((q) => q.expect.length).length;
questions.forEach((q, i) => {
  const shown = rank(queryVectors[i], vectors, stems(q.q), entryStems).map((k) => entries[k].id);
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
