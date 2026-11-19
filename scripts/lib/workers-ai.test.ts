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
