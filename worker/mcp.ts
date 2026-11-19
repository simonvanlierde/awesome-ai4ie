// Read-only MCP server at /mcp: stateless Streamable HTTP, no auth. Data comes from
// the build (/mcp-data.json, src/pages/mcp-data.json.ts), never from the repo at runtime.
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { LitEntry } from "../src/data/schemas.ts";
import { IE_TAGS, ML_TAGS } from "../src/data/tags.ts";
import type { Env } from "./search.ts";
import { MAX_QUERY, searchPapers } from "./search.ts";

type Data = {
  papers: (LitEntry & { href: string; bibtex?: string })[];
  applications: { id: string; ie: string[]; ml: string[] }[];
  skills: Record<string, string>;
};

let data: Promise<Data> | null = null;
function loadData(env: Env, origin: string): Promise<Data> {
  data ??= env.ASSETS.fetch(`${origin}/mcp-data.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`mcp-data.json: HTTP ${r.status}`);
      return r.json() as Promise<Data>;
    })
    .catch((err) => {
      data = null; // a failed load must not poison every later request
      throw err;
    });
  return data;
}

const FROM = "Results come from a curated reading list on AI for industrial ecology.";
const text = (value: unknown, isError = false) => ({
  content: [
    { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value) },
  ],
  isError,
});

function buildServer(request: Request, env: Env) {
  const origin = new URL(request.url).origin;
  const abs = (href: string) => new URL(href, origin).href;
  const server = new McpServer({ name: "ai4ie", version: "1.0.0" });

  server.registerTool(
    "search_papers",
    {
      description: `Find papers by meaning. Returns up to 5 papers (id, title, year, blurb, url), best first, or none if nothing is close. ${FROM}`,
      inputSchema: z.object({ question: z.string().trim().min(1).max(MAX_QUERY) }),
    },
    async ({ question }) => {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      if (!(await env.SEARCH_LIMIT.limit({ key: ip })).success)
        return text("Too many requests, try again in a minute.", true);
      const hits = (await searchPapers(env, origin, question)).map((e) => ({
        id: e.id,
        title: e.title,
        year: e.year,
        blurb: e.blurb,
        url: abs(e.href),
      }));
      return text({ papers: hits });
    },
  );

  server.registerTool(
    "get_paper",
    {
      description: `Get one paper by id: title, authors, year, DOI, blurb, tags, url and BibTeX when known. ${FROM}`,
      inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
    },
    async ({ id }) => {
      const p = (await loadData(env, origin)).papers.find((e) => e.id === id);
      return p
        ? text({ ...p, url: abs(p.href), href: undefined })
        : text(`No paper with id "${id}".`, true);
    },
  );

  server.registerTool(
    "list_applications",
    {
      description: `List AI applications in industrial ecology (name, summary, maturity, tags, paper ids). Filter by IE field and/or ML technique tag. ${FROM}`,
      inputSchema: z.object({
        field: z.enum(Object.keys(IE_TAGS) as [string, ...string[]]).optional(),
        technique: z.enum(Object.keys(ML_TAGS) as [string, ...string[]]).optional(),
      }),
    },
    async ({ field, technique }) => {
      const all = (await loadData(env, origin)).applications;
      return text({
        applications: all.filter(
          (a) => (!field || a.ie.includes(field)) && (!technique || a.ml.includes(technique)),
        ),
      });
    },
  );

  server.registerTool(
    "get_skill",
    {
      description:
        "Get the SKILL.md text of one Agent Skill for research with AI, by name. An unknown name returns the list of skill names.",
      inputSchema: z.object({ name: z.string().trim().min(1).max(100) }),
    },
    async ({ name }) => {
      const { skills } = await loadData(env, origin);
      return Object.hasOwn(skills, name)
        ? text(skills[name])
        : text({ error: `No skill named "${name}".`, skills: Object.keys(skills) }, true);
    },
  );

  return server;
}

export function handleMcp(request: Request, env: Env): Promise<Response> {
  return createMcpHandler(() => buildServer(request, env)).fetch(request);
}
