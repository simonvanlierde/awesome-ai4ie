// The site's only server code: POST /api/search returns the reading-list papers closest
// in meaning to a question. Static files are served before this runs (wrangler.jsonc).
import {
  decodeVector,
  EMBED_MODEL,
  type IndexEntry,
  queryText,
  rank,
  unit,
} from "../src/lib/semantic.ts";

type Env = {
  AI: { run(model: string, input: object): Promise<{ data: number[][] }> };
  ASSETS: { fetch(req: Request | string): Promise<Response> };
  SEARCH_LIMIT: { limit(opts: { key: string }): Promise<{ success: boolean }> };
};

/** What the dialog shows for one paper. */
export type Hit = Pick<IndexEntry, "title" | "year" | "blurb" | "href">;

// Longer than any question a reader types; caps what one request can spend.
const MAX_QUERY = 300;

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/search") return new Response("Not found", { status: 404 });
    if (request.method !== "POST")
      return new Response("Use POST", { status: 405, headers: { allow: "POST" } });

    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return new Response("Send application/json", { status: 415 });

    const key = limitKey(request.headers.get("cf-connecting-ip") ?? "unknown");
    if (!(await env.SEARCH_LIMIT.limit({ key })).success)
      return new Response("Too many requests", { status: 429 });

    const body: unknown = await request.json().catch(() => null);
    const q = typeof body === "object" && body && "q" in body ? body.q : null;
    if (typeof q !== "string" || !q.trim() || q.length > MAX_QUERY)
      return new Response(`Send {"q": "..."}, up to ${MAX_QUERY} characters`, { status: 400 });

    let entries: IndexEntry[], vectors: number[][], data: number[][];
    try {
      [{ entries, vectors }, { data }] = await Promise.all([
        loadIndex(env, url.origin),
        env.AI.run(EMBED_MODEL, { text: [queryText(q.trim())] }),
      ]);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause; the reader gets a 503
      console.error(err);
      return new Response("Search is unavailable, try again later", {
        status: 503,
        headers: { "retry-after": "60" },
      });
    }
    const hits: Hit[] = rank(unit(data[0]), vectors).map((i) => {
      const { title, year, blurb, href } = entries[i];
      return { title, year, blurb, href };
    });
    return Response.json({ hits }, { headers: { "cache-control": "no-store" } });
  },
};
