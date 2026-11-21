// The reading list as the Worker loads it, and meaning search over it, shared by POST
// /api/search and the MCP tools. Kept out of index.ts because the Workers runtime rejects any
// export there that is not a handler.
import {
  EMBED_DIM,
  EMBED_MODEL,
  type IndexEntry,
  queryText,
  rank,
  unit,
} from "../src/lib/semantic.ts";

export type RateLimiter = { limit(opts: { key: string }): Promise<{ success: boolean }> };
export type KVStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export type Env = {
  AI: { run(model: string, input: object): Promise<{ data: number[][] }> };
  ASSETS: { fetch(req: Request | string): Promise<Response> };
  SEARCH_LIMIT: RateLimiter;
  SEARCH_LIMIT_GLOBAL: RateLimiter;
  CONTRIBUTE_LIMIT?: RateLimiter;
  CONTRIBUTE_LIMIT_GLOBAL?: RateLimiter;
  POLL_KV?: KVStore;
  TURNSTILE_SECRET_KEY?: string;
  GITHUB_ISSUES_TOKEN?: string;
};

// Longer than any question a reader types; caps what one request can spend.
export const MAX_QUERY = 300;

// One isolate serves many requests; the assets change only with a deploy.
const assets = new Map<string, Promise<unknown>>();
/** What `load` gives, worked out once per isolate under `key`. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = assets.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    assets.set(key, p);
    p.catch(() => assets.delete(key)); // a failed load must not poison every later request
  }
  return p;
}

async function fetchAsset(env: Env, origin: string, path: string): Promise<Response> {
  const r = await env.ASSETS.fetch(`${origin}${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r;
}

/** A built JSON asset, fetched and parsed once per isolate. */
export function cachedJson<T>(env: Env, origin: string, path: string): Promise<T> {
  return cached(path, async () => (await fetchAsset(env, origin, path)).json() as Promise<T>);
}

/** Every entry of the reading list. */
export function loadIndex(env: Env, origin: string): Promise<IndexEntry[]> {
  return cachedJson(env, origin, "/literature-index.json");
}

type Searchable = { entries: IndexEntry[]; vectors: Float32Array[] };
/** The entries meaning search ranks, with their vectors: views into
 * literature-vectors.bin, so nothing is parsed or copied. Only search waits for that file. */
function loadSearchable(env: Env, origin: string): Promise<Searchable> {
  return cached("/literature-vectors.bin", async () => {
    const [all, bin] = await Promise.all([
      loadIndex(env, origin),
      fetchAsset(env, origin, "/literature-vectors.bin").then((r) => r.arrayBuffer()),
    ]);
    // An entry without a row (a build that skipped `pnpm run embed`) is not searched.
    const entries = all.filter((e) => e.vectorRow !== undefined);
    // A file of another length would still slice into rows, just wrong ones.
    if (bin.byteLength !== entries.length * EMBED_DIM * 4)
      throw new Error(`literature-vectors.bin: ${bin.byteLength} bytes for ${entries.length} rows`);
    const vectors = entries.map(
      (e) => new Float32Array(bin, (e.vectorRow as number) * EMBED_DIM * 4, EMBED_DIM),
    );
    return { entries, vectors };
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

/** False when this visitor has used up SEARCH_LIMIT, or all visitors at this Cloudflare location
 * SEARCH_LIMIT_GLOBAL (approximate: counts are per location)
 * (many IPs, or a whole IPv6 range, would get past the per-visitor count), null when a limiter
 * fails: the caller then answers "unavailable" rather than spend AI calls unmetered. */
export async function withinLimit(env: Env, request: Request): Promise<boolean | null> {
  const key = limitKey(request.headers.get("cf-connecting-ip") ?? "unknown");
  try {
    if (!(await env.SEARCH_LIMIT.limit({ key })).success) return false;
    const ok = (await env.SEARCH_LIMIT_GLOBAL.limit({ key: "all" })).success;
    // biome-ignore lint/suspicious/noConsole: Workers Logs show when the shared cap turns readers away
    if (!ok) console.warn("search: SEARCH_LIMIT_GLOBAL reached");
    return ok;
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
    const { entries, vectors } = await loadSearchable(env, origin);
    if (!entries.length) throw new Error("literature-index.json: no entry has a vector row");
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
