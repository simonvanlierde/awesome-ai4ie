// Meaning-based search over the reading list: the search dialog embeds the query
// and every entry with the same model, then ranks entries by cosine similarity.

// The embedding model, pinned to a commit of its Hugging Face repo like the demo's.
export const MODEL = "Xenova/all-MiniLM-L6-v2";
// biome-ignore lint/security/noSecrets: a public git commit id, not a secret
export const MODEL_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
export const DTYPE = "q8";

/** One literature entry as the search index ships it (src/pages/literature-index.json.ts). */
export type IndexEntry = {
  title: string;
  year: number;
  blurb: string;
  href: string;
  text: string;
  /** Base64 float32 vector computed at build time (src/lib/vectors.ts), when one matches. */
  vector?: string;
};

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

// Cut-offs for all-MiniLM-L6-v2 (q8), tuned on src/data/search-eval.yaml with
// scripts/search-eval.mjs. At or above STRONG an entry shows on meaning alone;
// between SOFT and STRONG it shows only when it also shares a content word with
// the query. Meaning alone left a window of 0.414 (an off-list question) to 0.430
// (a right answer) on that set; the word gate makes it wide.
export const STRONG_SCORE = 0.45;
export const SOFT_SCORE = 0.38;
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
