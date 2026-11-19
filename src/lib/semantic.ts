// Meaning-based search over the reading list: the search dialog embeds the query
// and every entry with the same model, then ranks entries by cosine similarity.

/** One literature entry as the search index ships it (src/pages/literature-index.json.ts). */
export type IndexEntry = {
  title: string;
  year: number;
  blurb: string;
  href: string;
  text: string;
};

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

// Below this cosine (all-MiniLM-L6-v2, q8) an entry is not shown. In-list questions
// scored 0.52–0.78 on their best entry and off-topic ones 0.14–0.35 (trial, 10+4 queries).
export const MIN_SCORE = 0.45;
export const MAX_HITS = 5;

const WORD = /\S+/g;

/** Keyword queries are Pagefind's job; meaning search answers questions and phrases. */
export function isPhrase(query: string): boolean {
  return (query.match(WORD)?.length ?? 0) >= 3;
}

/** Indices of the best entries for a query vector, best first, all scoring at least MIN_SCORE.
 * Vectors must be normalized, so the dot product is the cosine. */
export function rank(query: ArrayLike<number>, vectors: ArrayLike<number>[]): number[] {
  return vectors
    .map((v, i) => {
      let s = 0;
      for (let j = 0; j < v.length; j++) s += v[j] * query[j];
      return { i, s };
    })
    .filter((h) => h.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_HITS)
    .map((h) => h.i);
}
