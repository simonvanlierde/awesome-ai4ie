import { describe, expect, it, vi } from "vitest";
import { EMBED_DIM, EMBED_MODEL, queryText } from "../src/lib/semantic";
import worker from "./index";
import { AI_TIMEOUT_MS, limitKey } from "./search";

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
  href: `/literature/#${title}`,
  bibtex: `@article{${title}}`,
  vector: v,
});
// Fixtures name two dimensions; the Worker expects the model's full length.
const full = (v: number[]) => [...v, ...Array(EMBED_DIM - v.length).fill(0)];
// The two files the build ships for these papers: the index with a row per vector, and
// literature-vectors.bin holding those rows.
const shipped = (papers: object[]) => {
  const rows: number[][] = [];
  const index = papers.map(({ vector, ...e }: { vector?: number[] }) =>
    vector ? { ...e, vectorRow: rows.push(full(vector)) - 1 } : e,
  );
  return { index, bin: new Float32Array(rows.flat()).buffer };
};
const hit = (title: string) => ({
  title,
  year: 2024,
  blurb: "B.",
  href: `/literature/#${title}`,
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
    {
      id: "a1",
      name: "A1",
      ie: ["lca"],
      ml: ["llm"],
      summary: "See [the map](/applications-map/).",
      href: "/applications-map/lca/#a1",
    },
    {
      id: "a2",
      name: "A2",
      ie: ["sem"],
      ml: ["cv"],
      demo: "demos/",
      href: "/applications-map/sem/#a2",
    },
  ],
  resources: [
    { id: "r1", title: "R1", url: "https://example.org/r1", kind: "tool", ie: ["eeio"], topic: [] },
    {
      id: "r2",
      title: "R2",
      url: "https://example.org/r2",
      kind: "dataset",
      ie: ["lca"],
      topic: ["buildings"],
    },
    {
      id: "r3",
      title: "R3",
      url: "https://example.org/r3",
      kind: "course",
      ie: ["sem"],
      topic: [],
    },
  ],
  skills: { "ml-reproducibility": "# Skill text" },
};

type Opts = {
  allowed?: boolean | "throws";
  globalAllowed?: boolean;
  index?: object[];
  ai?: () => Promise<{ data: number[][] }>;
  assets?: (url: string) => Response | undefined;
};
const env = ({ allowed = true, globalAllowed = true, index = INDEX, ai, assets }: Opts = {}) => {
  const runs: { model: string; text: string[] }[] = [];
  const keys: string[] = [];
  const globalKeys: string[] = [];
  return {
    runs,
    keys,
    globalKeys,
    AI: {
      run: (model: string, input: { text: string[] }) => {
        runs.push({ model, text: input.text });
        return ai ? ai() : Promise.resolve({ data: [full([6, 1.5])] });
      },
    },
    SEARCH_LIMIT: {
      limit: ({ key }: { key: string }) => {
        keys.push(key);
        if (allowed === "throws") return Promise.reject(new Error("no binding"));
        return Promise.resolve({ success: allowed });
      },
    },
    SEARCH_LIMIT_GLOBAL: {
      limit: ({ key }: { key: string }) => {
        globalKeys.push(key);
        return Promise.resolve({ success: globalAllowed });
      },
    },
    ASSETS: {
      fetch: async (url: Request | string) =>
        assets?.(String(url)) ??
        (String(url).endsWith("/mcp-data.json")
          ? Response.json(MCP_DATA)
          : String(url).endsWith("/literature-vectors.bin")
            ? new Response(shipped(index).bin)
            : Response.json(shipped(index).index)),
    },
  };
};
const post = (body: string, { path = "/api/search", type = "application/json", ip = "" } = {}) =>
  new Request(`https://ai4ie.org${path}`, {
    method: "POST",
    body,
    headers: { "content-type": type, ...(ip && { "cf-connecting-ip": ip }) },
  });
// The assets are cached per isolate, so a test with other assets loads the module afresh.
const fresh = async () => {
  vi.resetModules();
  return (await import("./index")).default;
};

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

  it("answers 429 when all visitors together pass the global cap, whatever their IP", async () => {
    const e = env({ globalAllowed: false });
    expect((await worker.fetch(post('{"q": "a b c"}', { ip: "192.0.2.1" }), e)).status).toBe(429);
    expect((await worker.fetch(post('{"q": "a b c"}', { ip: "198.51.100.7" }), e)).status).toBe(
      429,
    );
    expect(e.globalKeys).toEqual(["all", "all"]);
    expect(e.runs).toEqual([]);
  });

  it("limits requests, other methods and other paths", async () => {
    expect((await worker.fetch(post('{"q": "a b c"}'), env({ allowed: false }))).status).toBe(429);
    const broken = env({ allowed: "throws" });
    expect((await worker.fetch(post('{"q": "a b c"}'), broken)).status).toBe(503);
    expect(broken.runs).toEqual([]);
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
  });

  it("answers 503 when the model does not answer in time", async () => {
    vi.useFakeTimers();
    try {
      const reply = worker.fetch(
        post('{"q": "a b c"}'),
        env({ ai: () => new Promise(() => undefined) }),
      );
      await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
      expect((await reply).status).toBe(503);
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers 503 when no entry has a vector, without calling the model", async () => {
    const e = env({ index: [paper("unembedded")] });
    expect((await (await fresh()).fetch(post('{"q": "a b c"}'), e)).status).toBe(503);
    expect(e.runs).toEqual([]);
  });

  it.each([
    ["one row short", (3 - 1) * EMBED_DIM * 4],
    ["rows of another length", 3 * 2 * 4],
    ["empty", 0],
  ])("answers 503 when the vectors file is %s, without calling the model", async (_, n) => {
    const e = env({
      assets: (url) => (url.endsWith(".bin") ? new Response(new Uint8Array(n)) : undefined),
    });
    expect((await (await fresh()).fetch(post('{"q": "a b c"}'), e)).status).toBe(503);
    expect(e.runs).toEqual([]);
  });

  it("loads the index again after a failed load", async () => {
    let fails = 1;
    const e = env({ assets: () => (fails-- > 0 ? new Response("", { status: 500 }) : undefined) });
    const w = await fresh();
    expect((await w.fetch(post('{"q": "a b c"}'), e)).status).toBe(503);
    expect((await w.fetch(post('{"q": "a b c"}'), e)).status).toBe(200);
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
  const HEADERS = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  type Req = { e?: ReturnType<typeof env>; ip?: string; headers?: object; w?: typeof worker };
  const send = (body: string, { e = env(), ip = "", headers = {}, w = worker }: Req = {}) =>
    w.fetch(
      new Request("https://ai4ie.org/mcp", {
        method: "POST",
        headers: { ...HEADERS, ...(ip && { "cf-connecting-ip": ip }), ...headers },
        body,
      }),
      e,
    );
  const rpc = async (method: string, params: object, req: Req = {}) => {
    const r = await send(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), req);
    const body = await r.text();
    // A reply is plain JSON or one SSE "data:" event.
    const json = body.startsWith("{") ? body : (body.match(SSE_DATA)?.[1] ?? "{}");
    return JSON.parse(json);
  };
  const call = (name: string, args: object, req: Req = {}) =>
    rpc("tools/call", { name, arguments: args }, req).then((m) => m.result);
  const payload = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

  it("initializes and lists the five read-only tools", async () => {
    const inits = await Promise.all(
      ["2025-11-25", "2026-07-28"].map((protocolVersion) =>
        rpc("initialize", {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: "t", version: "1" },
        }),
      ),
    );
    for (const init of inits) expect(init.result.serverInfo.name).toBe("ai4ie");
    const { tools } = (await rpc("tools/list", {})).result;
    expect(tools.map((t: { name: string }) => t.name).sort()).toEqual([
      "get_paper",
      "get_skill",
      "list_applications",
      "list_resources",
      "search_papers",
    ]);
    for (const t of tools) {
      expect(t.title).toBeTruthy();
      expect(t.annotations).toEqual({
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      });
    }
  });

  it("searches with an absolute url, the id and a proposal's status", async () => {
    const index = [...INDEX, { ...paper("proposed", [1, 0.1]), status: "proposal" }];
    const r = await call(
      "search_papers",
      { question: "waste sorting with cameras" },
      {
        e: env({ index }),
        w: await fresh(),
      },
    );
    expect(payload(r).papers.map((p: { id: string; status?: string }) => [p.id, p.status])).toEqual(
      [
        ["proposed", "proposal"],
        ["nearer", undefined],
        ["near", undefined],
      ],
    );
    expect(payload(r).papers[1]).toEqual({
      id: "nearer",
      title: "nearer",
      year: 2024,
      blurb: "B.",
      url: "https://ai4ie.org/literature/#nearer",
    });
  });

  it("answers coded tool errors when search is unavailable or limited", async () => {
    const codes = await Promise.all(
      [
        env({ ai: () => Promise.reject(new Error("AI down")) }),
        env({ allowed: "throws" }),
        env({ allowed: false }),
      ].map(async (e) => {
        const r = await call("search_papers", { question: "a b c" }, { e });
        expect(r.isError).toBe(true);
        return payload(r).error;
      }),
    );
    expect(codes).toEqual(["unavailable", "unavailable", "rate_limited"]);
  });

  it("answers a tool error when no entry has a vector, without calling the model", async () => {
    const e = env({ index: [paper("unembedded")] });
    const r = await call("search_papers", { question: "a b c" }, { e, w: await fresh() });
    expect(payload(r).error).toBe("unavailable");
    expect(e.runs).toEqual([]);
  });

  it("refuses a JSON-RPC batch before any search runs", async () => {
    const e = env();
    const one = { jsonrpc: "2.0", method: "tools/call", params: { name: "search_papers" } };
    const r = await send(
      JSON.stringify([
        { ...one, id: 1 },
        { ...one, id: 2 },
      ]),
      { e },
    );
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe(-32600);
    expect(e.runs).toEqual([]);
  });

  it("gets a paper's listed fields with its BibTeX, and reports an unknown id", async () => {
    const { vector, href, ...listed } = paper("near", [0.8, 0.6]);
    expect(payload(await call("get_paper", { id: "near" }))).toEqual({
      ...listed,
      url: "https://ai4ie.org/literature/#near",
    });
    const nope = await call("get_paper", { id: "nope" });
    expect([nope.isError, payload(nope).error]).toEqual([true, "not_found"]);
  });

  it("answers unavailable when an asset fails, and loads it again next time", async () => {
    for (const [file, name, args] of [
      ["/literature-index.json", "get_paper", { id: "near" }],
      ["/literature-vectors.bin", "search_papers", { question: "a b c" }],
      ["/mcp-data.json", "list_applications", {}],
      ["/mcp-data.json", "list_resources", {}],
      ["/mcp-data.json", "get_skill", { name: "ml-reproducibility" }],
    ] as const) {
      let fails = 1;
      const e = env({
        assets: (url) =>
          url.endsWith(file) && fails-- > 0 ? new Response("", { status: 500 }) : undefined,
      });
      // biome-ignore lint/performance/noAwaitInLoops: each case needs its own fresh module cache
      const w = await fresh();
      expect(payload(await call(name, args, { e, w })).error).toBe("unavailable");
      expect((await call(name, args, { e, w })).isError).toBe(false);
    }
  });

  it("finds a paper by id while the vectors file fails", async () => {
    const e = env({
      assets: (url) => (url.endsWith(".bin") ? new Response("", { status: 500 }) : undefined),
    });
    const w = await fresh();
    expect(payload(await call("search_papers", { question: "a b c" }, { e, w })).error).toBe(
      "unavailable",
    );
    expect(payload(await call("get_paper", { id: "near" }, { e, w })).id).toBe("near");
  });

  it("filters applications, with site links made absolute", async () => {
    const ids = async (args: object) =>
      payload(await call("list_applications", args)).applications.map((a: { id: string }) => a.id);
    expect(await ids({})).toEqual(["a1", "a2"]);
    expect(await ids({ field: "sem" })).toEqual(["a2"]);
    expect(await ids({ technique: "llm" })).toEqual(["a1"]);
    expect(await ids({ field: "sem", technique: "llm" })).toEqual([]);
    const [a1, a2] = payload(await call("list_applications", {})).applications;
    expect(a1.summary).toBe("See [the map](https://ai4ie.org/applications-map/).");
    expect(a2.demo).toBe("https://ai4ie.org/demos/");
  });

  it("links each application to its place on the map, and finds one by id", async () => {
    const [a1] = payload(await call("list_applications", {})).applications;
    expect([a1.url, a1.href]).toEqual(["https://ai4ie.org/applications-map/lca/#a1", undefined]);
    const one = async (name: string, list: string, id: string) =>
      payload(await call(name, { id }))[list].map((x: { id: string }) => x.id);
    expect(await one("list_applications", "applications", "a2")).toEqual(["a2"]);
    expect(await one("list_resources", "resources", "r2")).toEqual(["r2"]);
    expect(await one("list_resources", "resources", "nope")).toEqual([]);
  });

  it("answers structured content that matches each tool's output schema", async () => {
    const { tools } = (await rpc("tools/list", {})).result;
    const withSchema = tools
      .filter((t: { outputSchema?: object }) => t.outputSchema)
      .map((t: { name: string }) => t.name)
      .sort();
    expect(withSchema).toEqual([
      "get_paper",
      "list_applications",
      "list_resources",
      "search_papers",
    ]);
    for (const [name, args] of [
      ["search_papers", { question: "a b c" }],
      ["get_paper", { id: "near" }],
      ["list_applications", {}],
      ["list_resources", {}],
    ] as const) {
      // biome-ignore lint/performance/noAwaitInLoops: the search cases share one rate-limit fake
      const r = await call(name, args);
      expect(r.isError, name).toBe(false);
      expect(r.structuredContent, name).toEqual(payload(r));
    }
  });

  it("maps a retired tag to its replacement", async () => {
    const ids = async (name: string, list: string, args: object) =>
      payload(await call(name, args))[list].map((x: { id: string }) => x.id);
    expect(await ids("list_applications", "applications", { field: "mfa" })).toEqual(["a2"]);
    // io was a topic and is now an IE field.
    expect(await ids("list_resources", "resources", { topic: "io" })).toEqual(["r1"]);
    const gone = await call("list_resources", { field: "urban-mining" });
    expect([gone.isError, payload(gone).error]).toEqual([true, "not_found"]);
  });

  it("filters resources by kind, field and topic", async () => {
    const ids = async (args: object) =>
      payload(await call("list_resources", args)).resources.map((r: { id: string }) => r.id);
    expect(await ids({})).toEqual(["r1", "r2", "r3"]);
    expect(await ids({ kind: "tool" })).toEqual(["r1"]);
    expect(await ids({ field: "sem" })).toEqual(["r3"]);
    expect(await ids({ topic: "buildings" })).toEqual(["r2"]);
    expect(await ids({ field: "lca", topic: "buildings" })).toEqual(["r2"]);
  });

  it("returns a skill, and lists the names for an unknown one", async () => {
    expect((await call("get_skill", { name: "ml-reproducibility" })).content[0].text).toBe(
      "# Skill text",
    );
    const r = await call("get_skill", { name: "toString" });
    expect([r.isError, payload(r).error, payload(r).skills]).toEqual([
      true,
      "not_found",
      ["ml-reproducibility"],
    ]);
  });

  it("rejects bad arguments", async () => {
    const bad = [
      ["search_papers", { question: "x".repeat(301) }],
      ["search_papers", { question: "   " }],
      ["search_papers", { question: 5 }],
      ["list_applications", { field: "bogus" }],
      ["list_resources", { topic: "bogus" }],
      ["get_paper", {}],
      ["no_such_tool", {}],
    ] as const;
    const replies = await Promise.all(
      bad.map(([name, args]) => rpc("tools/call", { name, arguments: args })),
    );
    for (const m of replies) expect(m.error ?? m.result?.isError).toBeTruthy();
  });

  it("answers protocol errors as the transport requires", async () => {
    const req = (init: RequestInit) =>
      worker.fetch(new Request("https://ai4ie.org/mcp", init), env()).then((r) => r.status);
    const list = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    expect(await req({ method: "GET", headers: HEADERS })).toBe(405);
    expect(await req({ method: "DELETE", headers: HEADERS })).toBe(405);
    expect(
      await req({ method: "POST", headers: { ...HEADERS, accept: "text/html" }, body: list }),
    ).toBe(406);
    expect(await req({ method: "POST", headers: HEADERS, body: "{not json" })).toBe(400);
    expect(
      await req({
        method: "POST",
        headers: { ...HEADERS, "mcp-protocol-version": "1999-01-01" },
        body: list,
      }),
    ).toBe(400);
  });

  it("refuses a browser page on another site, not this host, localhost or a client without Origin", async () => {
    const list = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    const status = async (origin?: string) =>
      (await send(list, { headers: origin ? { origin } : {} })).status;
    expect({
      evil: await status("https://evil.example"),
      lookalike: await status("https://ai4ie.org.evil.example"),
      null: await status("null"),
      self: await status("https://ai4ie.org"),
      localhost: await status("http://localhost:4321"),
      none: await status(),
    }).toEqual({ evil: 403, lookalike: 403, null: 403, self: 200, localhost: 200, none: 200 });
  });
});
