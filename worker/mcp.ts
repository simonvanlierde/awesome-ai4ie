// Read-only MCP server at /mcp: stateless Streamable HTTP, no auth. Data comes from the build,
// never from the repo at runtime: the reading list from literature-index.json (shared with
// /api/search, worker/search.ts), the rest from /mcp-data.json (src/pages/mcp-data.json.ts).
import {
  createMcpHandler,
  localhostAllowedOrigins,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppEntry, ResourceEntry } from "../src/data/schemas.ts";
import { RESOURCE_KINDS } from "../src/data/schemas.ts";
import { IE_TAGS, ML_TAGS, TOPIC_TAGS } from "../src/data/tags.ts";
import { cachedJson, type Env, loadIndex, MAX_QUERY, searchPapers, withinLimit } from "./search.ts";

type Data = {
  applications: (AppEntry & { href: string })[];
  resources: ResourceEntry[];
  skills: Record<string, string>;
};

const keys = <K extends string>(o: Record<K, string>) => Object.keys(o) as [K, ...K[]];
const fieldArg = z.enum(keys(IE_TAGS)).optional();
const idArg = z.string().trim().min(1).max(200).optional();
const list = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k} (${v})`)
    .join(", ");
const FIELDS = `IE fields: ${list(IE_TAGS)}.`;
const TOPICS = `Topics: ${list(TOPIC_TAGS)}.`;

const FROM = "Results come from a curated reading list on AI for industrial ecology.";
const ALL = "Returns every match; the lists are small.";
const text = (value: unknown, isError = false) => ({
  content: [
    { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value) },
  ],
  isError,
});
// The text block stays for clients that read only content; structuredContent follows outputSchema.
const json = (value: Record<string, unknown>) => ({ ...text(value), structuredContent: value });
type Code = "not_found" | "rate_limited" | "unavailable";
/** A tool error: JSON with a stable `error` code a client can branch on. */
const fail = (error: Code, message: string, more: object = {}) =>
  text({ error, message, ...more }, true);
// Every tool that reads a build asset answers "unavailable" when the asset fails to load.
const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };
const guarded =
  <A, R>(fn: (args: A) => Promise<R>) =>
  async (args: A) => {
    try {
      return await fn(args);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause; the client gets a tool error
      console.error(err);
      return fail("unavailable", "The reading list is unavailable, try again later.");
    }
  };

const tags = z.array(z.string());
const PAPER_HIT = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number(),
  blurb: z.string(),
  status: z.literal("proposal").optional(),
  url: z.url(),
});
const PAPER = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  etAl: z.boolean(),
  year: z.number(),
  doi: z.string().optional(),
  arxiv: z.string().optional(),
  blurb: z.string(),
  ie: tags,
  topic: tags,
  ml: tags,
  type: tags,
  status: z.literal("proposal").optional(),
  url: z.url(),
  bibtex: z.string().optional(),
});
// Loose: the curated entries carry more optional fields than a client needs to rely on.
const APPLICATION = z.looseObject({
  id: z.string(),
  name: z.string(),
  url: z.url(),
  ie: tags,
  ml: tags,
});
const RESOURCE = z.looseObject({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  kind: z.string(),
  ie: tags,
  topic: tags,
});

function buildServer(request: Request, env: Env) {
  const origin = new URL(request.url).origin;
  const abs = (href: string) => new URL(href, origin).href;
  // Curated text links to site pages as "](/page/)"; a client has no base to resolve them.
  const absLinks = (value: unknown) =>
    JSON.parse(JSON.stringify(value).replaceAll("](/", `](${origin}/`));
  const loadData = () => cachedJson<Data>(env, origin, "/mcp-data.json");
  const server = new McpServer({ name: "ai4ie", version: "1.0.0" });

  server.registerTool(
    "search_papers",
    {
      title: "Search papers",
      description: `Find papers by meaning. Returns {papers: [...]} with up to 5 papers (id, title, year, blurb, url, and status "proposal" for one not yet reviewed), best first; an empty list when nothing is close. Pass an id to get_paper for the details. ${FROM}`,
      inputSchema: z.object({ question: z.string().trim().min(1).max(MAX_QUERY) }),
      outputSchema: z.object({ papers: z.array(PAPER_HIT) }),
      annotations: READ_ONLY,
    },
    guarded(async ({ question }) => {
      const allowed = await withinLimit(env, request);
      if (allowed === null) return fail("unavailable", "Search is unavailable, try again later.");
      if (!allowed) return fail("rate_limited", "Too many searches, try again in a minute.");
      const found = await searchPapers(env, origin, question);
      if (!found) return fail("unavailable", "Search is unavailable, try again later.");
      return json({
        papers: found.map((e) => ({
          id: e.id,
          title: e.title,
          year: e.year,
          blurb: e.blurb,
          status: e.status,
          url: abs(e.href),
        })),
      });
    }),
  );

  server.registerTool(
    "get_paper",
    {
      title: "Get a paper",
      description: `Get one paper by the id search_papers or list_applications returns: title, authors, year, DOI or arXiv id, blurb, IE fields, topics, ML techniques, url and BibTeX when known. ${FROM}`,
      inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
      outputSchema: PAPER,
      annotations: READ_ONLY,
    },
    guarded(async ({ id }) => {
      const p = (await loadIndex(env, origin)).find((e) => e.id === id);
      if (!p) return fail("not_found", `No paper with id "${id}".`);
      return json({
        id: p.id,
        title: p.title,
        authors: p.authors,
        etAl: p.etAl,
        year: p.year,
        doi: p.doi,
        arxiv: p.arxiv,
        blurb: p.blurb,
        ie: p.ie,
        topic: p.topic,
        ml: p.ml,
        type: p.type,
        status: p.status,
        url: abs(p.href),
        bibtex: p.bibtex,
      });
    }),
  );

  server.registerTool(
    "list_applications",
    {
      title: "List applications",
      description: `List AI applications in industrial ecology (id, name, summary, maturity, IE fields, ML techniques, paper ids for get_paper, url of its place on the site's map). Filter by id, IE field and/or ML technique. ${ALL} ${FIELDS} ${FROM}`,
      inputSchema: z.object({
        id: idArg,
        field: fieldArg,
        technique: z.enum(keys(ML_TAGS)).optional(),
      }),
      outputSchema: z.object({ applications: z.array(APPLICATION) }),
      annotations: READ_ONLY,
    },
    guarded(async ({ id, field, technique }) => {
      const all = (await loadData()).applications;
      return json(
        absLinks({
          applications: all
            .filter(
              (a) =>
                (!id || a.id === id) &&
                (!field || a.ie.includes(field)) &&
                (!technique || a.ml.includes(technique)),
            )
            .map(({ href, ...a }) => ({
              ...a,
              url: abs(href),
              ...(a.demo && { demo: abs(a.demo) }),
            })),
        }),
      );
    }),
  );

  server.registerTool(
    "list_resources",
    {
      title: "List resources",
      description: `List tools, datasets, models, courses, videos, posts and communities outside the reading list (id, title, url, kind, blurb, tags). Filter by id, kind, IE field and/or topic. ${ALL} ${FIELDS} ${TOPICS} ${FROM}`,
      inputSchema: z.object({
        id: idArg,
        kind: z.enum(keys(RESOURCE_KINDS)).optional(),
        field: fieldArg,
        topic: z.enum(keys(TOPIC_TAGS)).optional(),
      }),
      outputSchema: z.object({ resources: z.array(RESOURCE) }),
      annotations: READ_ONLY,
    },
    guarded(async ({ id, kind, field, topic }) => {
      const all = (await loadData()).resources;
      return json(
        absLinks({
          resources: all.filter(
            (r) =>
              (!id || r.id === id) &&
              (!kind || r.kind === kind) &&
              (!field || r.ie.includes(field)) &&
              (!topic || r.topic.includes(topic)),
          ),
        }),
      );
    }),
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get a skill",
      description:
        "Get the SKILL.md text of one Agent Skill for research with AI, by name. An unknown name returns a not_found error with the list of skill names.",
      inputSchema: z.object({ name: z.string().trim().min(1).max(100) }),
      annotations: READ_ONLY,
    },
    guarded(async ({ name }) => {
      const { skills } = await loadData();
      return Object.hasOwn(skills, name)
        ? text(skills[name])
        : fail("not_found", `No skill named "${name}".`, { skills: Object.keys(skills) });
    }),
  );

  return server;
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  // The spec requires an Origin check (against DNS rebinding). A browser page may call
  // from this site's own host or localhost; clients outside a browser send no Origin.
  const allowed = [new URL(request.url).hostname, ...localhostAllowedOrigins()];
  const rejected = originValidationResponse(request, allowed);
  if (rejected) return rejected;
  // MCP dropped JSON-RPC batches in 2025-06-18, but the SDK still takes up to 100 per POST,
  // which would let one request fan out into many searches.
  if (request.method === "POST" && (await request.clone().text()).trimStart().startsWith("["))
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Send one message per request" },
      },
      { status: 400 },
    );
  return createMcpHandler(() => buildServer(request, env)).fetch(request);
}
