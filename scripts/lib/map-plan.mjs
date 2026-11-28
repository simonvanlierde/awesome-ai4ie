// What `pnpm run embed` does for the literature map's vectors, without the network: which
// papers need OpenAlex, and each paper's text, key and source once the abstracts are in.
import { textKey } from "../../src/lib/vectors.ts";
import { abstractText, entryDoi } from "./openalex.mjs";

/** A paper's source key: its title plus the abstract hash in literature-meta.json (or its
 * summary), so an edited title or a new abstract re-embeds it. */
function source(e, meta) {
  return textKey(`${e.title}\n\n${meta[e.id]?.abstract ?? e.blurb}`);
}

/** The papers without a usable cached map vector, and the DOIs to ask OpenAlex for: only those
 * with a known abstract, since OpenAlex runs on a daily budget. */
export function mapTodo(entries, meta, cache) {
  const todo = entries.filter(
    (e) => !(cache.sources[e.id] === source(e, meta) && cache.vectors[cache.keys[e.id]]),
  );
  return { todo, dois: todo.flatMap((e) => (meta[e.id]?.abstract && entryDoi(e)) || []) };
}

/** Each paper's text key and source, and the texts to embed. `works` is the OpenAlex reply by
 * DOI, or null when the fetch failed. A paper whose known abstract did not arrive uses its
 * summary this run and gets a null source, so the next run retries it. */
export function mapPlan(entries, meta, cache, works) {
  const { todo } = mapTodo(entries, meta, cache);
  /** @type {Record<string, string>} */
  const keys = {};
  /** @type {Record<string, string | null>} */
  const sources = {};
  const texts = [];
  for (const e of entries) {
    if (!todo.includes(e)) {
      keys[e.id] = cache.keys[e.id];
      sources[e.id] = cache.sources[e.id];
      continue;
    }
    const abstract = abstractText(works?.get(entryDoi(e) ?? "")?.abstract_inverted_index);
    const text = `${e.title}\n\n${abstract || e.blurb}`;
    texts.push(text);
    keys[e.id] = textKey(text);
    sources[e.id] = meta[e.id]?.abstract && !abstract ? null : source(e, meta);
  }
  return { keys, sources, texts };
}
