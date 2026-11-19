// The site's only server code: POST /api/embed returns the meaning-search vector of a
// question. Static files are served before this runs (wrangler.jsonc).
import { EMBED_MODEL, EMBED_POOLING, unit } from "../src/lib/semantic.ts";

type Env = {
  AI: { run(model: string, input: object): Promise<{ data: number[][] }> };
  EMBED_LIMIT: { limit(opts: { key: string }): Promise<{ success: boolean }> };
};

// Longer than any question a reader types; caps what one request can spend.
const MAX_QUERY = 300;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api/embed") return new Response("Not found", { status: 404 });
    if (request.method !== "POST")
      return new Response("Use POST", { status: 405, headers: { allow: "POST" } });

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.EMBED_LIMIT.limit({ key: ip })).success)
      return new Response("Too many requests", { status: 429 });

    const body: unknown = await request.json().catch(() => null);
    const q = typeof body === "object" && body && "q" in body ? body.q : null;
    if (typeof q !== "string" || !q.trim() || q.length > MAX_QUERY)
      return new Response(`Send {"q": "..."}, up to ${MAX_QUERY} characters`, { status: 400 });

    const { data } = await env.AI.run(EMBED_MODEL, { text: [q.trim()], pooling: EMBED_POOLING });
    return Response.json({ vector: unit(data[0]) }, { headers: { "cache-control": "no-store" } });
  },
};
