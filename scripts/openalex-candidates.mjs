// Find new AI-in-IE papers on OpenAlex and append them to src/data/candidates.yaml
// as leads for a curator. A lead is never an entry: its blurb still has to come
// from the full text (MAINTAINING.md, "Weekly candidates").
//
//   node scripts/openalex-candidates.mjs                       last 14 days, top 25
//   node scripts/openalex-candidates.mjs --since 2024-01-01 --limit 60   backfill
//
// Skips every DOI already in literature.yaml or candidates.yaml, so a rejected
// lead stays rejected. No API key or secret needed.
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { parse, stringify } from "yaml";

const UA = "awesome-ai4ie-candidates (https://github.com/simonvanlierde/awesome-ai4ie)";
const LIT_PATH = new URL("../src/data/literature.yaml", import.meta.url);
const CAND_PATH = new URL("../src/data/candidates.yaml", import.meta.url);

const AI = [
  "machine learning",
  "deep learning",
  "neural network",
  "large language model",
  "computer vision",
  "artificial intelligence",
];
const IE = [
  "life cycle assessment",
  "material flow analysis",
  "industrial ecology",
  "industrial symbiosis",
  "urban mining",
  "material stock",
  "circular economy",
  "input-output",
  "carbon footprint",
];
export const QUERY = `(${AI.map((t) => `"${t}"`).join(" OR ")}) AND (${IE.map((t) => `"${t}"`).join(" OR ")})`;

// Suggested tags, from words in the title and abstract. A hint for the curator,
// who sets the real tags from the full text.
const HINTS = {
  ie: {
    lca: /life[- ]cycle (assessment|inventory|impact)|\bLCA\b|carbon footprint|emission factor/i,
    mfa: /material flow|\bMFA\b|material stock|in-use stock/i,
    eol: /\bwaste\b|recycl|end[- ]of[- ]life|circular economy|remanufactur|disassembl/i,
    "urban-mining": /urban mining|secondary (raw )?material/i,
    symbiosis: /industrial symbiosis|by-product exchange/i,
  },
  topic: {
    buildings: /building|construction/i,
    chemicals: /chemical|toxicity|QSAR/i,
    electronics: /e-waste|WEEE|electronic/i,
    metals: /\bsteel\b|alumin|copper|lithium|critical (raw )?material|rare earth/i,
    food: /agricultur|\bcrop|\bfood\b/i,
    water: /\bwater\b/i,
    lifetime: /lifetime|lifespan|\breuse\b|repair|remaining useful life/i,
    energy: /decarboni|\benergy system|electricity|power grid/i,
    "supply-risk": /supply (chain )?risk|criticality|supply security/i,
    io: /input[- ]output|\bMRIO\b|EXIOBASE/i,
  },
  ml: {
    llm: /large language model|\bLLMs?\b|\bGPT|ChatGPT/i,
    "nlp-extraction": /natural language processing|text mining|\bNLP\b|topic model/i,
    cv: /computer vision|image|convolutional|\bCNN/i,
    "remote-sensing": /satellite|remote sensing|earth observation/i,
    "tabular-ml": /random forest|gradient boost|XGBoost|regression|neural network/i,
    uncertainty: /bayesian|uncertainty|gaussian process/i,
  },
};

/** OpenAlex stores abstracts as word → positions; rebuild the text. */
export function abstractText(index) {
  if (!index) return "";
  const words = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.filter(Boolean).join(" ");
}

export function suggestTags(text) {
  const out = {};
  for (const [dim, map] of Object.entries(HINTS)) {
    const tags = Object.keys(map).filter((t) => map[t].test(text));
    if (tags.length > 0) out[dim] = tags;
  }
  return out;
}

const DOI_URL = /^https:\/\/doi\.org\//;

function bareDoi(doi) {
  return doi?.replace(DOI_URL, "").toLowerCase();
}

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
    hints: suggestTags(`${work.title} ${abstractText(work.abstract_inverted_index)}`),
    found: today,
    status: "new",
  };
}

/** Leads whose DOI is in neither list, in the order given. */
export function newLeads(leads, literature, candidates) {
  const seen = new Set(
    [...literature, ...candidates].map((e) => e.doi?.toLowerCase()).filter(Boolean),
  );
  return leads.filter((l) => l && !seen.has(l.doi) && seen.add(l.doi));
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
  const filter = [
    `title_and_abstract.search:${QUERY}`,
    `from_publication_date:${since}`,
    "type:article|review|preprint",
    "is_retracted:false",
    "language:en",
  ].join(",");
  const params = new URLSearchParams({
    filter,
    sort: "relevance_score:desc",
    "per-page": "100",
    select:
      "doi,title,publication_year,primary_location,best_oa_location,open_access,abstract_inverted_index",
  });
  const res = await fetch(`https://api.openalex.org/works?${params}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${await res.text()}`);
  const { meta, results } = await res.json();

  const literature = parse(await readFile(LIT_PATH, "utf8"));
  const candidates = parse(await readFile(CAND_PATH, "utf8").catch(() => "")) ?? [];
  const added = newLeads(
    results.map((w) => toLead(w, today)),
    literature,
    candidates,
  ).slice(0, limit);
  if (added.length > 0)
    await writeFile(CAND_PATH, `${HEADER}${stringify([...candidates, ...added])}`);
  console.log(`${meta.count} matches since ${since}; ${added.length} new leads`);
}

const HEADER = `# Leads from OpenAlex (scripts/openalex-candidates.mjs), for a curator.
# status: new, then rejected (add a one-line why) or listed (it is in literature.yaml).
# The script never re-adds a DOI that is here, so keep rejected leads.
`;

if (import.meta.url === `file://${process.argv[1]}`) await main();
