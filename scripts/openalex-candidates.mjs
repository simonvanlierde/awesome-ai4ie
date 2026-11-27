// Find new AI-in-IE papers on OpenAlex and append them to src/data/candidates.yaml
// as leads for a curator. A lead is never an entry: its blurb still has to come
// from the full text (MAINTAINING.md, "Weekly candidates").
//
//   node scripts/openalex-candidates.mjs                       last 14 days, top 25
//   node scripts/openalex-candidates.mjs --since 2024-01-01 --limit 60   backfill
//
// Each lead is scored by how close its title and abstract sit to listed papers
// rather than to rejected leads (a small local embedding model, no API key), and
// gets the tags its nearest listed papers share. Leads below the score of the
// least typical listed papers are left out. Every run re-scores the open leads,
// so the queue order follows what was listed or rejected since. Skips every DOI
// already in literature.yaml or candidates.yaml, so a rejected lead stays rejected.
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";
import { abstractText, bareDoi, openalex, worksByDoi } from "./lib/openalex.mjs";

const LIT_PATH = new URL("../src/data/literature.yaml", import.meta.url);
const CAND_PATH = new URL("../src/data/candidates.yaml", import.meta.url);
const MODEL = "Xenova/bge-small-en-v1.5";
const K = 3;
// Share of listed papers allowed to score below the cut-off: 79 of 83 listed and
// 30 of 53 rejected papers fall on the right side of it (leave-one-out, 2026-11).
// A higher cut catches few more rejects for each listed paper it loses.
const FLOOR_PERCENTILE = 0.06;
const TAG_DIMS = ["ie", "topic", "ml"];

// A bare "artificial intelligence" mostly matches papers that mention AI in
// passing, so it counts only in the core venues below.
const AI = [
  "machine learning",
  "deep learning",
  "neural network",
  "large language model",
  "computer vision",
];
const IE = [
  "life cycle assessment",
  "material flow analysis",
  "industrial ecology",
  "industrial symbiosis",
  "urban mining",
  "material stock",
  "circular economy",
  // A bare "input-output" also matches signal, circuit and model input-output pairs.
  "input-output analysis",
  "input-output table",
  "input-output model",
  "multi-regional input-output",
  "environmentally extended input-output",
  "carbon footprint",
];
// J. Ind. Ecol., Environ. Sci. Technol., Resour. Conserv. Recycl. (and its Advances),
// Waste Manag. and Int. J. Life Cycle Assess. Their abstracts often name no IE
// term, as the venue already implies one, so a method term is enough there.
const VENUES = ["S203731762", "S13479253", "S18051569", "S4210240235", "S19266977", "S108239708"];
const METHODS = [
  ...AI,
  "artificial intelligence",
  "random forest",
  "gradient boosting",
  "natural language processing",
  "Bayesian",
  "remote sensing",
  "satellite",
];

function anyOf(terms) {
  return terms.map((t) => `"${t}"`).join(" OR ");
}

export const QUERY = `(${anyOf(AI)}) AND (${anyOf(IE)})`;
export const VENUE_QUERY = anyOf(METHODS);

/** One lead from an OpenAlex work, or null when it has no DOI (nothing to dedupe on). */
export function toLead(work, today) {
  const doi = bareDoi(work.doi);
  if (!doi) return null;
  return {
    doi,
    title: work.title,
    year: work.publication_year,
    venue: work.primary_location?.source?.display_name ?? null,
    oa: work.best_oa_location?.pdf_url ?? work.open_access?.oa_url ?? null,
    found: today,
    status: "new",
  };
}

/**
 * The lower-case DOIs of these entries. An arXiv id counts as its DataCite DOI,
 * which is how OpenAlex names a preprint.
 */
export function knownDois(entries) {
  return new Set(
    entries
      .flatMap((e) => [e.doi, e.arxiv && `10.48550/arxiv.${e.arxiv}`])
      .filter(Boolean)
      .map((d) => d.toLowerCase()),
  );
}

/** Leads whose DOI is in neither list, in the order given. */
export function newLeads(leads, literature, candidates) {
  const seen = knownDois([...literature, ...candidates]);
  return leads.filter((l) => l && !seen.has(l.doi) && seen.add(l.doi));
}

function dot(a, b) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

/**
 * The k references most similar to `v` (unit vectors), best first, skipping `self`.
 * @param {string | null} [self]
 */
export function nearest(v, refs, k = K, self = null) {
  return refs
    .filter((r) => r.key !== self)
    .map((r) => ({ ...r, sim: dot(v, r.vec) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k);
}

function mean(xs) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/**
 * Closeness to listed papers minus closeness to rejected leads; higher is likelier listed.
 * @param {string | null} [self]
 */
export function score(v, listed, rejected, self = null) {
  const near = nearest(v, listed, K, self);
  const far = rejected.length > 0 ? mean(nearest(v, rejected, K, self).map((r) => r.sim)) : 0;
  return { score: mean(near.map((r) => r.sim)) - far, near };
}

/** Tags at least two of the nearest listed papers share, per dimension. */
export function neighbourTags(near) {
  const out = {};
  for (const dim of TAG_DIMS) {
    const counts = new Map();
    for (const n of near)
      for (const t of n.tags?.[dim] ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    const tags = [...counts].filter(([, c]) => c >= 2).map(([t]) => t);
    if (tags.length > 0) out[dim] = tags;
  }
  return out;
}

/** The score below which only `p` of the listed papers fall (each scored leaving itself out). */
export function floor(listed, rejected, p = FLOOR_PERCENTILE) {
  const s = listed.map((r) => score(r.vec, listed, rejected, r.key).score).sort((a, b) => a - b);
  return s[Math.floor(p * s.length)];
}

/** A lead with its score, its nearest listed papers and the tags they share. */
export function rate(lead, vec, listed, rejected) {
  const { score: s, near } = score(vec, listed, rejected);
  return {
    ...lead,
    score: Math.round(s * 1000) / 1000,
    near: near.map((n) => n.id),
    hints: neighbourTags(near),
  };
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** A warning when this run's leads score below the middle of the open queue, else null. */
export function lowBatch(added, open) {
  if (added.length === 0 || open.length === 0) return null;
  const a = median(added.map((l) => l.score));
  const o = median(open.map((l) => l.score));
  return a < o
    ? `Low batch: the new leads' median score (${a.toFixed(3)}) is below the open queue's (${o.toFixed(3)}), so expect most of them to be rejected.`
    : null;
}

/** Split `xs` into consecutive parts of the given lengths, plus the rest. */
function splitAt(xs, lengths) {
  const parts = [];
  let i = 0;
  for (const n of lengths) {
    parts.push(xs.slice(i, i + n));
    i += n;
  }
  return [...parts, xs.slice(i)];
}

const SELECT =
  "doi,title,publication_year,primary_location,best_oa_location,open_access,abstract_inverted_index";

function textOf(work, fallback) {
  return `${work?.title ?? fallback}. ${abstractText(work?.abstract_inverted_index)}`.trim();
}

async function embedder() {
  const { pipeline } = await import("@huggingface/transformers");
  const extract = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  return async (texts) => {
    // Attention memory grows with batch size times length squared: one batch of
    // a few hundred abstracts takes several GB, so embed a few at a time.
    const out = [];
    for (let i = 0; i < texts.length; i += 8) {
      const batch = await extract(texts.slice(i, i + 8), { pooling: "cls", normalize: true });
      out.push(...batch.tolist());
    }
    return out;
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  // shortcut: windows on publication date, so a paper OpenAlex indexes more than 14
  // days after it appears is missed; a premium key would allow from_created_date.
  const since = arg("since", new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10));
  const limit = Number(arg("limit", 25));
  // shortcut: one page of results; page with cursor=* if a backfill ever needs more.
  if (!(limit > 0 && limit <= 100)) throw new Error("--limit must be 1 to 100");
  const window = [
    `from_publication_date:${since}`,
    "type:article|review|preprint",
    "is_retracted:false",
    "language:en",
  ];
  const searches = [
    [`title_and_abstract.search:${QUERY}`],
    [`title_and_abstract.search:${VENUE_QUERY}`, `primary_location.source.id:${VENUES.join("|")}`],
  ];
  const pages = [];
  for (const filter of searches)
    pages.push(
      await openalex({
        filter: [...filter, ...window].join(","),
        sort: "relevance_score:desc",
        "per-page": "100",
        select: SELECT,
      }),
    );
  const results = pages.flatMap((p) => p.results);

  const literature = parse(await readFile(LIT_PATH, "utf8"));
  const candidates = parse(await readFile(CAND_PATH, "utf8").catch(() => "")) ?? [];
  const fresh = newLeads(
    results.map((w) => toLead(w, today)),
    literature,
    candidates,
  );
  const works = new Map(results.map((w) => [bareDoi(w.doi), w]));

  // Only AI-in-IE entries are references; the research-practice and ML-landmark ones are not.
  const refsLit = literature.filter((e) => e.doi && (e.ie?.length || e.topic?.length));
  const refsRej = candidates.filter((c) => c.status === "rejected");
  const open = candidates.filter((c) => c.status === "new");
  const missing = [...refsLit, ...refsRej, ...open].map((e) => e.doi.toLowerCase());
  const more = await worksByDoi(
    missing.filter((d) => !works.has(d)),
    SELECT,
  );
  for (const [doi, w] of more) works.set(doi, w);

  const embed = await embedder();
  const vecs = await embed(
    [...refsLit, ...refsRej, ...open, ...fresh].map((e) =>
      textOf(works.get(e.doi.toLowerCase()), e.title),
    ),
  );
  const [vLit, vRej, vOpen, vFresh] = splitAt(vecs, [refsLit.length, refsRej.length, open.length]);
  const listed = refsLit.map((e, i) => ({
    key: e.doi.toLowerCase(),
    id: e.id,
    tags: { ie: e.ie, topic: e.topic, ml: e.ml },
    vec: vLit[i],
  }));
  const rejected = refsRej.map((e, i) => ({ key: e.doi.toLowerCase(), vec: vRej[i] }));
  const cut = floor(listed, rejected);

  const rescored = open.map((l, i) => rate(l, vOpen[i], listed, rejected));
  const added = fresh
    .map((l, i) => rate(l, vFresh[i], listed, rejected))
    .filter((l) => l.score >= cut)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const queue = [...rescored, ...added].sort((a, b) => b.score - a.score);
  const closed = candidates.filter((c) => c.status !== "new");
  await writeFile(CAND_PATH, `${HEADER}${stringify([...queue, ...closed])}`);
  const [all, venue] = pages.map((p) => p.meta.count);
  console.log(
    `${all} matches since ${since}, and ${venue} in the core IE venues; ${fresh.length} unseen, ${added.length} new leads above ${cut.toFixed(3)}; ${open.length} open leads re-scored.`,
  );
  const warning = lowBatch(added, rescored);
  if (warning) console.log(warning);
}

const HEADER = `# Leads from OpenAlex (scripts/openalex-candidates.mjs), for a curator.
# Open leads come first, best score first; near names the closest listed papers
# and hints the tags they share. status: new, then rejected (add a one-line why)
# or listed (it is in literature.yaml). The script never re-adds a DOI that is
# here, so keep rejected leads.
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
