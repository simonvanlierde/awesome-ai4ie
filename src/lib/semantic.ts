// Meaning-based search over the reading list: entries are embedded at build time
// (scripts/embed-literature.mjs) and the question by the site's /api/search Worker
// (worker/index.ts), both with this Workers AI model; the Worker ranks by cosine similarity.

export const EMBED_MODEL = "@cf/qwen/qwen3-embedding-0.6b";

// Qwen3 embeds a query after a one-line task instruction and a document as is. On
// search-eval.yaml the instruction put the right paper first for all 30 in-list
// questions (the other 8 of the 38 are off-list), against 27 without it.
const QUERY_INSTRUCTION = "Given a question, retrieve research papers that answer it";

/** The text embedded for a reader's question. */
export function queryText(q: string): string {
  return `Instruct: ${QUERY_INSTRUCTION}\nQuery: ${q}`;
}

/** One literature entry as the search index ships it (src/pages/literature-index.json.ts). */
export type IndexEntry = {
  title: string;
  year: number;
  blurb: string;
  href: string;
  /** Base64 float32 vector computed at build time (src/lib/vectors.ts); missing in a
   * build that skipped `pnpm run embed`, and then the entry is not searched. */
  vector?: string;
};

/** The vector scaled to length 1, so a dot product of two is their cosine. */
export function unit(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

/** Reverses encodeVector() in src/lib/vectors.ts. */
export function decodeVector(b64: string): number[] {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return Array.from(new Float32Array(bytes.buffer));
}

/** The text embedded for an entry: what a reader would match a question against. */
export function entryText(e: {
  title: string;
  blurb: string;
  ie?: string[];
  ml?: string[];
  type?: string[];
}): string {
  return `${e.title}. ${e.blurb} Tags: ${[...(e.ie ?? []), ...(e.ml ?? []), ...(e.type ?? [])].join(", ")}`;
}

// Cut-off for EMBED_MODEL and queryText(), tuned on src/data/search-eval.yaml with
// scripts/search-eval.mjs; a model or instruction change needs a new tuning. On that
// set the off-list questions score at most 0.495 and the weakest right answer 0.608.
export const MIN_SCORE = 0.55;
export const MAX_HITS = 5;

const WORD = /\S+/g;

/** Keyword queries are Pagefind's job; meaning search answers questions and phrases. */
export function isPhrase(query: string): boolean {
  return (query.match(WORD)?.length ?? 0) >= 3;
}

/** Each vector's dot product with the query: the cosine when both are unit length. */
export function scores(query: ArrayLike<number>, vectors: ArrayLike<number>[]): number[] {
  return vectors.map((v) => {
    let s = 0;
    for (let j = 0; j < v.length; j++) s += v[j] * query[j];
    return s;
  });
}

/** Indices of the entries at or above MIN_SCORE, best first, at most MAX_HITS.
 * Vectors must be unit length, so the dot product is the cosine. */
export function rank(query: ArrayLike<number>, vectors: ArrayLike<number>[]): number[] {
  return scores(query, vectors)
    .map((s, i) => ({ i, s }))
    .filter((h) => h.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_HITS)
    .map((h) => h.i);
}
