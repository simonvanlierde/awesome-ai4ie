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
import { type Env, loadIndex, MAX_QUERY, searchPapers, withinLimit } from "./search.ts";

type Data = {
  applications: AppEntry[];
  resources: ResourceEntry[];
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

const keys = <K extends string>(o: Record<K, string>) => Object.keys(o) as [K, ...K[]];
const fieldArg = z.enum(keys(IE_TAGS)).optional();
const topicArg = z.enum(keys(TOPIC_TAGS)).optional();
const list = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k} (${v})`)
    .join(", ");
const FIELDS = `IE fields: ${list(IE_TAGS)}.`;
const TOPICS = `Topics: ${list(TOPIC_TAGS)}.`;

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
      if (!(await withinLimit(env, request)))
        return text("Too many requests, try again in a minute.", true);
      const found = await searchPapers(env, origin, question);
      if (!found) return text("Search is unavailable, try again later.", true);
      return text({
        papers: found.map((e) => ({
          id: e.id,
          title: e.title,
          year: e.year,
          blurb: e.blurb,
          url: abs(e.href),
        })),
      });
    },
  );

  server.registerTool(
    "get_paper",
    {
      description: `Get one paper by id: title, authors, year, DOI or arXiv id, blurb, IE fields, topics, ML techniques, url and BibTeX when known. ${FROM}`,
      inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
    },
    async ({ id }) => {
      let all: Awaited<ReturnType<typeof loadIndex>>["all"];
      try {
        ({ all } = await loadIndex(env, origin));
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause; the client gets a tool error
        console.error(err);
        return text("The reading list is unavailable, try again later.", true);
      }
      const p = all.find((e) => e.id === id);
      if (!p) return text(`No paper with id "${id}".`, true);
      return text({
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
    },
  );

  server.registerTool(
    "list_applications",
    {
      description: `List AI applications in industrial ecology (name, summary, maturity, IE fields, ML techniques, paper ids). Filter by IE field and/or ML technique. ${FIELDS} ${FROM}`,
      inputSchema: z.object({ field: fieldArg, technique: z.enum(keys(ML_TAGS)).optional() }),
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
    "list_resources",
    {
      description: `List tools, datasets, models, courses, videos, posts and communities outside the reading list (title, url, kind, blurb, tags). Filter by kind, IE field and/or topic. ${FIELDS} ${TOPICS} ${FROM}`,
      inputSchema: z.object({
        kind: z.enum(keys(RESOURCE_KINDS)).optional(),
        field: fieldArg,
        topic: topicArg,
      }),
    },
    async ({ kind, field, topic }) => {
      const all = (await loadData(env, origin)).resources;
      return text({
        resources: all.filter(
          (r) =>
            (!kind || r.kind === kind) &&
            (!field || r.ie.includes(field)) &&
            (!topic || r.topic.includes(topic)),
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
  // The spec requires an Origin check (against DNS rebinding). A browser page may call
  // from this site's own host or localhost; clients outside a browser send no Origin.
  const allowed = [new URL(request.url).hostname, ...localhostAllowedOrigins()];
  const rejected = originValidationResponse(request, allowed);
  if (rejected) return Promise.resolve(rejected);
  return createMcpHandler(() => buildServer(request, env)).fetch(request);
}
