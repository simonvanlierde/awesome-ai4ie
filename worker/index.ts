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
      return { entries, vectors: entries.map((e) => decodeVector(e.vector as string)) };
    })
    .catch((err) => {
      index = null; // a failed load must not poison every later request
      throw err;
    });
  return index;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/search") return new Response("Not found", { status: 404 });
    if (request.method !== "POST")
      return new Response("Use POST", { status: 405, headers: { allow: "POST" } });

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.SEARCH_LIMIT.limit({ key: ip })).success)
      return new Response("Too many requests", { status: 429 });

    const body: unknown = await request.json().catch(() => null);
    const q = typeof body === "object" && body && "q" in body ? body.q : null;
    if (typeof q !== "string" || !q.trim() || q.length > MAX_QUERY)
      return new Response(`Send {"q": "..."}, up to ${MAX_QUERY} characters`, { status: 400 });

    const [{ entries, vectors }, { data }] = await Promise.all([
      loadIndex(env, url.origin),
      env.AI.run(EMBED_MODEL, { text: [queryText(q.trim())] }),
    ]);
    const hits: Hit[] = rank(unit(data[0]), vectors).map((i) => {
      const { title, year, blurb, href } = entries[i];
      return { title, year, blurb, href };
    });
    return Response.json({ hits }, { headers: { "cache-control": "no-store" } });
  },
};
