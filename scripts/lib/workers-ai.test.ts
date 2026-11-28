import { afterEach, expect, it, vi } from "vitest";
import { embed } from "./workers-ai.mjs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("retries a rate-limited call after its Retry-After", async () => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "acct");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("slow down", { status: 429, headers: { "retry-after": "0" } }),
    )
    .mockResolvedValueOnce(Response.json({ result: { data: [[3, 4]] } }));
  vi.stubGlobal("fetch", fetch);
  expect(await embed(["a text"])).toEqual([[0.6, 0.8]]);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("splits a call that Workers AI refuses as too big, keeping the order", async () => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "acct");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
  const tooBig = () =>
    new Response('{"errors":[{"message":"AiError: input too big","code":3030}]}', { status: 400 });
  const fetch = vi.fn(async (_url: string, init: { body: string }) => {
    const { text } = JSON.parse(init.body) as { text: string[] };
    if (text.length > 1 || text[0].length > 1000) return tooBig();
    return Response.json({ result: { data: [[text[0].length, 0]] } });
  });
  vi.stubGlobal("fetch", fetch);
  // Two texts refused together, the second still refused alone until it is cut to 1000 characters.
  expect(await embed(["ab", "x".repeat(2000)])).toEqual([
    [1, 0],
    [1, 0],
  ]);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("still fails on a short text that is refused", async () => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "acct");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("input too big", { status: 400 })),
  );
  await expect(embed(["short"])).rejects.toThrow("HTTP 400");
});
