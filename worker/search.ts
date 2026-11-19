// The reading list as the Worker loads it, and meaning search over it, shared by POST
// /api/search and the MCP tools. Kept out of index.ts because the Workers runtime rejects any
// export there that is not a handler.
import {
  decodeVector,
  EMBED_MODEL,
  type IndexEntry,
  queryText,
  rank,
  unit,
} from "../src/lib/semantic.ts";

export type Env = {
  AI: { run(model: string, input: object): Promise<{ data: number[][] }> };
  ASSETS: { fetch(req: Request | string): Promise<Response> };
  SEARCH_LIMIT: { limit(opts: { key: string }): Promise<{ success: boolean }> };
};

// Longer than any question a reader types; caps what one request can spend.
export const MAX_QUERY = 300;

// One isolate serves many requests; the assets change only with a deploy.
const assets = new Map<string, Promise<unknown>>();
/** A built JSON asset, fetched and passed through `prepare` once per isolate. */
export function cachedJson<T>(
  env: Env,
  origin: string,
  path: string,
  prepare: (json: never) => T = (json) => json,
): Promise<T> {
  let p = assets.get(path) as Promise<T> | undefined;
  if (!p) {
    p = env.ASSETS.fetch(`${origin}${path}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => prepare(json as never));
    assets.set(path, p);
    p.catch(() => assets.delete(path)); // a failed load must not poison every later request
  }
  return p;
}

type Index = { all: IndexEntry[]; entries: IndexEntry[]; vectors: Float32Array[] };
/** Every entry (`all`), and the searchable ones with their decoded vectors. */
export function loadIndex(env: Env, origin: string): Promise<Index> {
  return cachedJson(env, origin, "/literature-index.json", (all: IndexEntry[]) => {
    // An entry without a build-time vector (a build that skipped `pnpm run embed`) is not searched.
    const entries = all.filter((e) => e.vector);
    return { all, entries, vectors: entries.map((e) => decodeVector(e.vector as string)) };
  });
}

const LEADING_ZEROS = /^0+(?=.)/;

/** The rate-limit key: an IPv6 visitor usually holds a whole /64, so it counts as one. */
export function limitKey(ip: string): string {
  // IPv4, also when written IPv4-mapped (::ffff:192.0.2.1)
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  return groups
    .slice(0, 4)
    .map((g) => g.replace(LEADING_ZEROS, ""))
    .join(":");
}

/** False when this visitor has used up SEARCH_LIMIT, null when the limiter fails: the caller
 * then answers "unavailable" rather than spend AI calls unmetered. */
export async function withinLimit(env: Env, request: Request): Promise<boolean | null> {
  const key = limitKey(request.headers.get("cf-connecting-ip") ?? "unknown");
  try {
    return (await env.SEARCH_LIMIT.limit({ key })).success;
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause
    console.error(err);
    return null;
  }
}

// Workers AI answers in well under a second; past this the caller says "unavailable".
export const AI_TIMEOUT_MS = 8000;

/** The reading-list entries closest in meaning to a question, best first, or null when the
 * index or the model fails (the cause goes to Workers Logs). */
export async function searchPapers(
  env: Env,
  origin: string,
  q: string,
): Promise<IndexEntry[] | null> {
  try {
    // The index first: no AI call is spent when there is nothing to search.
    const { entries, vectors } = await loadIndex(env, origin);
    if (!entries.length) throw new Error("literature-index.json: no entry has a vector");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data } = await Promise.race([
      env.AI.run(EMBED_MODEL, { text: [queryText(q.trim())] }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`AI.run: no answer in ${AI_TIMEOUT_MS} ms`)),
          AI_TIMEOUT_MS,
        );
      }),
    ]).finally(() => clearTimeout(timer));
    return rank(unit(data[0]), vectors).map((i) => entries[i]);
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause; the caller says "unavailable"
    console.error(err);
    return null;
  }
}
