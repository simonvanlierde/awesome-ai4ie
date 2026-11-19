import { describe, expect, it } from "vitest";
import { encodeVector } from "../src/lib/vectors";
import worker from "./index";

const paper = (title: string, v?: number[]) => ({
  title,
  year: 2024,
  blurb: "B.",
  href: `/literature/?papers=${title}`,
  text: title,
  vector: v && encodeVector(v),
});
const INDEX = [paper("near", [1, 0]), paper("far", [0, 1]), paper("unembedded")];

const env = (allowed = true) => {
  const queries: string[] = [];
  return {
    queries,
    AI: {
      run: (_m: string, input: { text: string[] }) => {
        queries.push(...input.text);
        return Promise.resolve({ data: [[3, 0.1]] });
      },
    },
    ASSETS: { fetch: async () => Response.json(INDEX) },
    SEARCH_LIMIT: { limit: async () => ({ success: allowed }) },
  };
};
const post = (body: string, path = "/api/search") =>
  new Request(`https://ai4ie.org${path}`, { method: "POST", body });

describe("worker", () => {
  it("returns the close papers only, without their vectors", async () => {
    const e = env();
    const r = await worker.fetch(post(JSON.stringify({ q: " waste sorting with cameras " })), e);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      hits: [{ title: "near", year: 2024, blurb: "B.", href: "/literature/?papers=near" }],
    });
    expect(e.queries[0].endsWith("Query: waste sorting with cameras")).toBe(true);
  });

  it("rejects a missing, empty or overlong question", async () => {
    const bodies = ["not json", "{}", '{"q": "  "}', JSON.stringify({ q: "x".repeat(301) })];
    const statuses = await Promise.all(
      bodies.map(async (b) => (await worker.fetch(post(b), env())).status),
    );
    expect(statuses).toEqual([400, 400, 400, 400]);
  });

  it("limits requests, other methods and other paths", async () => {
    expect((await worker.fetch(post('{"q": "a b c"}'), env(false))).status).toBe(429);
    expect((await worker.fetch(new Request("https://ai4ie.org/api/search"), env())).status).toBe(
      405,
    );
    expect((await worker.fetch(post("{}", "/api/other"), env())).status).toBe(404);
  });
});
