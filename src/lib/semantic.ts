// Meaning-based search over the reading list: entries are embedded at build time
// (scripts/embed-literature.mjs), the query by the site's /api/embed Worker
// (worker/index.ts), both with this Workers AI model, then ranked by cosine similarity.

export const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";
// cls is the model card's recommended pooling; vectors from mean and cls do not mix.
export const EMBED_POOLING = "cls";

/** One literature entry as the search index ships it (src/pages/literature-index.json.ts). */
export type IndexEntry = {
  title: string;
  year: number;
  blurb: string;
  href: string;
  text: string;
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

// Cut-offs for EMBED_MODEL with EMBED_POOLING, tuned on src/data/search-eval.yaml
// with scripts/search-eval.mjs; a model or pooling change needs a new tuning. At or
// above STRONG an entry shows on meaning alone; between SOFT and STRONG it shows
// only when it also shares a content word with the query. On that set, STRONG holds
// from 0.74 to 0.80, and SOFT sits between an off-list question's 0.702 and the
// weakest right answer's 0.728.
export const STRONG_SCORE = 0.77;
export const SOFT_SCORE = 0.715;
export const MAX_HITS = 5;

// Words too common in questions and entries to say what they are about.
const STOP = new Set(
  (
    "about also approach based best could data does first find from have help into know " +
    "learning like machine made make method methods model models more most only other " +
    "paper papers read review should some studies study tags than that their them then " +
    "there these they this those used using very what when where which with would your"
  ).split(" "),
);
const LETTERS = /[a-z]+/g;

/** Content words of a text, cut to five letters so "citations" meets "citation" and
 * "hallucinate" meets "hallucination". */
export function stems(text: string): Set<string> {
  const words = text.toLowerCase().match(LETTERS) ?? [];
  return new Set(words.filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 5)));
}

const WORD = /\S+/g;

/** Keyword queries are Pagefind's job; meaning search answers questions and phrases. */
export function isPhrase(query: string): boolean {
  return (query.match(WORD)?.length ?? 0) >= 3;
}

/** Indices of the best entries for a query, best first (see STRONG_SCORE).
 * Vectors must be normalized, so the dot product is the cosine. */
export function rank(
  query: ArrayLike<number>,
  vectors: ArrayLike<number>[],
  queryStems: Set<string>,
  entryStems: Set<string>[],
): number[] {
  const shares = (i: number) => [...queryStems].some((w) => entryStems[i].has(w));
  return vectors
    .map((v, i) => {
      let s = 0;
      for (let j = 0; j < v.length; j++) s += v[j] * query[j];
      return { i, s };
    })
    .filter((h) => h.s >= STRONG_SCORE || (h.s >= SOFT_SCORE && shares(h.i)))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_HITS)
    .map((h) => h.i);
}
