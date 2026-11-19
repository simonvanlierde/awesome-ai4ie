import { describe, expect, it } from "vitest";
import worker from "./index";

const env = (allowed = true) => ({
  AI: { run: async () => ({ data: [[3, 4]] }) },
  EMBED_LIMIT: { limit: async () => ({ success: allowed }) },
});
const post = (body: string, path = "/api/embed") =>
  new Request(`https://ai4ie.org${path}`, { method: "POST", body });

describe("worker", () => {
  it("returns the question's unit vector", async () => {
    const r = await worker.fetch(post(JSON.stringify({ q: "waste sorting with cameras" })), env());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ vector: [0.6, 0.8] });
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
    expect((await worker.fetch(new Request("https://ai4ie.org/api/embed"), env())).status).toBe(
      405,
    );
    expect((await worker.fetch(post("{}", "/api/other"), env())).status).toBe(404);
  });
});
