import { describe, expect, it, vi } from "vitest";
import { EMBED_MODEL, queryText } from "../src/lib/semantic";
import { encodeVector } from "../src/lib/vectors";
import worker, { limitKey } from "./index";

const paper = (title: string, v?: number[]) => ({
  title,
  year: 2024,
  blurb: "B.",
  href: `/literature/?papers=${title}`,
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
    ASSETS: { fetch: async () => Response.json(index) },
    SEARCH_LIMIT: {
      limit: ({ key }: { key: string }) => {
        keys.push(key);
        return Promise.resolve({ success: allowed });
      },
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
