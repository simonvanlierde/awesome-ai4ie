// The site's server code: /mcp (worker/mcp.ts), /api/contribute (worker/contribute.ts),
// /api/poll (worker/poll.ts), and POST /api/search, which returns the reading-list papers
// closest in meaning to a question. Static files are served before this runs (wrangler.jsonc).
import type { IndexEntry } from "../src/lib/semantic.ts";
import { handleContribute } from "./contribute.ts";
import { handleMcp } from "./mcp.ts";
import { handlePoll, Poll } from "./poll.ts";
import { type Env, MAX_QUERY, searchPapers, withinLimit } from "./search.ts";

export { Poll };

/** What the dialog shows for one paper. */
export type Hit = Pick<IndexEntry, "title" | "year" | "blurb" | "href">;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") return handleMcp(request, env);
    if (url.pathname === "/api/contribute") return handleContribute(request, env);
    if (url.pathname === "/api/poll") return handlePoll(request, env);
    if (url.pathname !== "/api/search") return new Response("Not found", { status: 404 });
    if (request.method !== "POST")
      return new Response("Use POST", { status: 405, headers: { allow: "POST" } });

    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return new Response("Send application/json", { status: 415 });

    const allowed = await withinLimit(env, request);
    if (allowed === null) return new Response("Search is unavailable", { status: 503 });
    if (!allowed) return new Response("Too many requests", { status: 429 });

    const body: unknown = await request.json().catch(() => null);
    const q = typeof body === "object" && body && "q" in body ? body.q : null;
    if (typeof q !== "string" || !q.trim() || q.length > MAX_QUERY)
      return new Response(`Send {"q": "..."}, up to ${MAX_QUERY} characters`, { status: 400 });

    const found = await searchPapers(env, url.origin, q);
    if (!found) return new Response("Search is unavailable", { status: 503 });
    const hits: Hit[] = found.map(({ title, year, blurb, href }) => ({ title, year, blurb, href }));
    return Response.json({ hits }, { headers: { "cache-control": "no-store" } });
  },
};
