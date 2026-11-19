import { describe, expect, it, vi } from "vitest";
import { EMBED_MODEL, queryText } from "../src/lib/semantic";
import { encodeVector } from "../src/lib/vectors";
import worker from "./index";
import { limitKey } from "./search";

const paper = (title: string, v?: number[]) => ({
  id: title,
  title,
  authors: ["Doe, J."],
  etAl: false,
  year: 2024,
  doi: "10.5555/12345678",
  blurb: "B.",
  ie: ["lca"],
  topic: [],
  ml: ["llm"],
  type: ["method"],
  href: `/literature/?papers=${title}`,
  bibtex: `@article{${title}}`,
  vector: v && encodeVector(v),
});
const hit = (title: string) => ({
  title,
  year: 2024,
  blurb: "B.",
  href: `/literature/?papers=${title}`,
});
// The fake model answers [6, 1.5], not unit length. After unit(), "nearer" scores 0.97,
// "near" 0.92 and "far" 0.24, below MIN_SCORE; the raw dot product would let "far" in at 1.5.
const INDEX = [
  paper("near", [0.8, 0.6]),
  paper("far", [0, 1]),
  paper("nearer", [1, 0]),
  paper("unembedded"),
];

const SSE_DATA = /^data: (.*)$/m;
const MCP_DATA = {
  applications: [
    { id: "a1", name: "A1", ie: ["lca"], ml: ["llm"] },
    { id: "a2", name: "A2", ie: ["sem"], ml: ["cv"] },
  ],
  resources: [
    { id: "r1", title: "R1", kind: "tool", ie: [], topic: [] },
    { id: "r2", title: "R2", kind: "dataset", ie: ["lca"], topic: ["buildings"] },
  ],
  skills: { "ml-reproducibility": "# Skill text" },
};

type Opts = { allowed?: boolean; index?: object[]; ai?: () => Promise<{ data: number[][] }> };
const env = ({ allowed = true, index = INDEX, ai }: Opts = {}) => {
  const runs: { model: string; text: string[] }[] = [];
  const keys: string[] = [];
  return {
    runs,
    keys,
    AI: {
      run: (model: string, input: { text: string[] }) => {
        runs.push({ model, text: input.text });
        return ai ? ai() : Promise.resolve({ data: [[6, 1.5]] });
      },
    },
    SEARCH_LIMIT: {
      limit: ({ key }: { key: string }) => {
        keys.push(key);
        return Promise.resolve({ success: allowed });
      },
    },
    ASSETS: {
      fetch: async (url: Request | string) =>
        String(url).endsWith("/mcp-data.json") ? Response.json(MCP_DATA) : Response.json(index),
    },
  };
};
const post = (body: string, { path = "/api/search", type = "application/json", ip = "" } = {}) =>
  new Request(`https://ai4ie.org${path}`, {
    method: "POST",
    body,
    headers: { "content-type": type, ...(ip && { "cf-connecting-ip": ip }) },
  });

describe("worker", () => {
  it("returns the close papers best first, without their vectors", async () => {
    const e = env();
    const r = await worker.fetch(post(JSON.stringify({ q: " waste sorting with cameras " })), e);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ hits: [hit("nearer"), hit("near")] });
    expect(e.runs).toEqual([
      { model: EMBED_MODEL, text: [queryText("waste sorting with cameras")] },
    ]);
  });

  it("rejects a missing, empty or overlong question", async () => {
    const bodies = ["not json", "{}", '{"q": "  "}', JSON.stringify({ q: "x".repeat(301) })];
    const statuses = await Promise.all(
      bodies.map(async (b) => (await worker.fetch(post(b), env())).status),
    );
    expect(statuses).toEqual([400, 400, 400, 400]);
  });

  it("rejects a body that is not JSON by its content type", async () => {
    const r = await worker.fetch(post('{"q": "a b c"}', { type: "text/plain" }), env());
    expect(r.status).toBe(415);
  });

  it("limits requests, other methods and other paths", async () => {
    expect((await worker.fetch(post('{"q": "a b c"}'), env({ allowed: false }))).status).toBe(429);
    expect((await worker.fetch(new Request("https://ai4ie.org/api/search"), env())).status).toBe(
      405,
    );
    expect((await worker.fetch(post("{}", { path: "/api/other" }), env())).status).toBe(404);
  });

  it("keys the limit on the visitor's IPv6 /64", async () => {
    const e = env();
    const ips = ["2001:db8:0:1::1", "2001:db8:0:1:ffff::2", "198.51.100.7"];
    await Promise.all(ips.map((ip) => worker.fetch(post('{"q": "a b c"}', { ip }), e)));
    expect(e.keys).toEqual(["2001:db8:0:1", "2001:db8:0:1", "198.51.100.7"]);
  });

  it("answers 503 when the model fails", async () => {
    const r = await worker.fetch(
      post('{"q": "a b c"}'),
      env({ ai: () => Promise.reject(new Error("AI down")) }),
    );
    expect(r.status).toBe(503);
    expect(r.headers.get("retry-after")).toBe("60");
  });

  it("answers 503 when no entry has a vector", async () => {
    vi.resetModules(); // the index is cached per isolate, so load the module afresh
    const { default: fresh } = await import("./index");
    const r = await fresh.fetch(post('{"q": "a b c"}'), env({ index: [paper("unembedded")] }));
    expect(r.status).toBe(503);
  });
});

describe("limitKey", () => {
  it("cuts IPv6 to its first four groups, expanding ::", () => {
    expect(limitKey("2001:DB8::1")).toBe("2001:db8:0:0");
    expect(limitKey("2001:0db8:0000:0001:0000:0000:0000:0001")).toBe("2001:db8:0:1");
    expect(limitKey("2001:db8:1:2:3:4::")).toBe("2001:db8:1:2");
    expect(limitKey("::1")).toBe("0:0:0:0");
    expect(limitKey("::ffff:192.0.2.1")).toBe("::ffff:192.0.2.1");
    expect(limitKey("192.0.2.1")).toBe("192.0.2.1");
  });
});

describe("/mcp", () => {
  const rpc = async (method: string, params: object, e = env(), ip = "") => {
    const r = await worker.fetch(
      new Request("https://ai4ie.org/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(ip && { "cf-connecting-ip": ip }),
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      }),
      e,
    );
    const body = await r.text();
    // A reply is plain JSON or one SSE "data:" event.
    const json = body.startsWith("{") ? body : (body.match(SSE_DATA)?.[1] ?? "{}");
    return JSON.parse(json);
  };
  const call = (name: string, args: object, e = env(), ip = "") =>
    rpc("tools/call", { name, arguments: args }, e, ip).then((m) => m.result);
  const payload = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

  it("initializes and lists the five tools", async () => {
    const init = await rpc("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "t", version: "1" },
    });
    expect(init.result.serverInfo.name).toBe("ai4ie");
    const list = await rpc("tools/list", {});
    expect(list.result.tools.map((t: { name: string }) => t.name).sort()).toEqual([
      "get_paper",
      "get_skill",
      "list_applications",
      "list_resources",
      "search_papers",
    ]);
  });

  it("searches with an absolute url and the id", async () => {
    const r = await call("search_papers", { question: "waste sorting with cameras" });
    expect(payload(r).papers).toEqual(
      ["nearer", "near"].map((id) => ({
        id,
        title: id,
        year: 2024,
        blurb: "B.",
        url: `https://ai4ie.org/literature/?papers=${id}`,
      })),
    );
  });

  it("answers a tool error when search is unavailable", async () => {
    const r = await call(
      "search_papers",
      { question: "a b c" },
      env({ ai: () => Promise.reject(new Error("AI down")) }),
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/unavailable/);
  });

  it("answers a tool error when no entry has a vector", async () => {
    vi.resetModules(); // the index is cached per isolate, so load the module afresh
    const { default: fresh } = await import("./index");
    const r = await fresh.fetch(
      new Request("https://ai4ie.org/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "search_papers", arguments: { question: "a b c" } },
        }),
      }),
      env({ index: [paper("unembedded")] }),
    );
    expect(await r.text()).toMatch(/"isError":true/);
  });

  it("keys the search limit on the visitor's IPv6 /64, as /api/search does", async () => {
    const e = env();
    await call("search_papers", { question: "a b c" }, e, "2001:db8:0:1::1");
    await worker.fetch(post('{"q": "a b c"}', { ip: "2001:db8:0:1:ffff::2" }), e);
    expect(e.keys).toEqual(["2001:db8:0:1", "2001:db8:0:1"]);
  });

  it("gets a paper's listed fields with its BibTeX, and reports an unknown id", async () => {
    const p = payload(await call("get_paper", { id: "near" }));
    expect(p.bibtex).toBe("@article{near}");
    expect(p.url).toBe("https://ai4ie.org/literature/?papers=near");
    expect(p).not.toHaveProperty("vector");
    expect(p).not.toHaveProperty("href");
    expect((await call("get_paper", { id: "nope" })).isError).toBe(true);
  });

  it("filters applications and returns a skill", async () => {
    expect(payload(await call("list_applications", { field: "sem" })).applications).toHaveLength(1);
    expect(payload(await call("list_applications", {})).applications).toHaveLength(2);
    expect((await call("get_skill", { name: "ml-reproducibility" })).content[0].text).toBe(
      "# Skill text",
    );
    expect(payload(await call("get_skill", { name: "toString" })).skills).toEqual([
      "ml-reproducibility",
    ]);
  });

  it("filters resources by kind, field and topic", async () => {
    const ids = async (args: object) =>
      payload(await call("list_resources", args)).resources.map((r: { id: string }) => r.id);
    expect(await ids({})).toEqual(["r1", "r2"]);
    expect(await ids({ kind: "tool" })).toEqual(["r1"]);
    expect(await ids({ field: "lca", topic: "buildings" })).toEqual(["r2"]);
  });

  it("rejects bad arguments and rate-limited searches", async () => {
    const bad = [
      ["search_papers", { question: "x".repeat(301) }],
      ["search_papers", { question: 5 }],
      ["list_applications", { field: "mfa" }],
      ["list_resources", { topic: "bogus" }],
      ["get_paper", {}],
    ] as const;
    const replies = await Promise.all(
      bad.map(([name, args]) => rpc("tools/call", { name, arguments: args })),
    );
    for (const m of replies) expect(m.error ?? m.result?.isError).toBeTruthy();
    expect(
      (await call("search_papers", { question: "a b c" }, env({ allowed: false }))).isError,
    ).toBe(true);
  });

  it("refuses a browser page on another site, not this host or a client without Origin", async () => {
    const status = async (origin?: string) => {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      };
      if (origin) headers.origin = origin;
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
      return (
        await worker.fetch(
          new Request("https://ai4ie.org/mcp", { method: "POST", headers, body }),
          env(),
        )
      ).status;
    };
    expect(await status("https://evil.example")).toBe(403);
    expect(await status("https://ai4ie.org")).toBe(200);
    expect(await status()).toBe(200);
  });
});
