// Meaning search over the reading list, shared by POST /api/search and the MCP tools. Kept out
// of index.ts because the Workers runtime rejects any export there that is not a handler.
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

type Index = { entries: IndexEntry[]; vectors: number[][] };
// One isolate serves many requests; the index changes only with a deploy.
let index: Promise<Index> | null = null;
function loadIndex(env: Env, origin: string): Promise<Index> {
  index ??= env.ASSETS.fetch(`${origin}/literature-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`literature-index.json: HTTP ${r.status}`);
      return r.json() as Promise<IndexEntry[]>;
    })
    .then((all) => {
      // An entry without a build-time vector (a build that skipped `pnpm run embed`) is not searched.
      const entries = all.filter((e) => e.vector);
      if (!entries.length) throw new Error("literature-index.json: no entry has a vector");
      return { entries, vectors: entries.map((e) => decodeVector(e.vector as string)) };
    })
    .catch((err) => {
      index = null; // a failed load must not poison every later request
      throw err;
    });
  return index;
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

/** The reading-list entries closest in meaning to a question, best first. */
export async function searchPapers(env: Env, origin: string, q: string) {
  const [{ entries, vectors }, { data }] = await Promise.all([
    loadIndex(env, origin),
    env.AI.run(EMBED_MODEL, { text: [queryText(q.trim())] }),
  ]);
  return rank(unit(data[0]), vectors).map((i) => entries[i]);
}
