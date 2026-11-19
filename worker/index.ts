// The site's only server code: /mcp (worker/mcp.ts), and POST /api/search, which returns the
// reading-list papers closest in meaning to a question. Static files are served before this
// runs (wrangler.jsonc).
import type { IndexEntry } from "../src/lib/semantic.ts";
import { handleMcp } from "./mcp.ts";
import { type Env, limitKey, MAX_QUERY, searchPapers } from "./search.ts";

/** What the dialog shows for one paper. */
export type Hit = Pick<IndexEntry, "title" | "year" | "blurb" | "href">;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") return handleMcp(request, env);
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

    let hits: Hit[];
    try {
      hits = (await searchPapers(env, url.origin, q)).map(({ title, year, blurb, href }) => ({
        title,
        year,
        blurb,
        href,
      }));
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause; the reader gets a 503
      console.error(err);
      return new Response("Search is unavailable, try again later", {
        status: 503,
        headers: { "retry-after": "60" },
      });
    }
    return Response.json({ hits }, { headers: { "cache-control": "no-store" } });
  },
};
