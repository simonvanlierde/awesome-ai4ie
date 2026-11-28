// Embeds texts with the meaning-search model through the Workers AI REST API, so
// scripts get the same vectors the site's /api/search Worker computes. Needs
// CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token with Workers AI read).

import process from "node:process";
import { EMBED_MODEL, unit } from "../../src/lib/semantic.ts";

// Texts per call; Workers AI caps a call at 100.
const BATCH = 50;
const RETRIES = 3;

/** POSTs, retrying a 429 or 5xx after its Retry-After seconds, or 1, 2, 4 s without one. */
async function post(url, init) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
    if (r.ok || attempt === RETRIES || !(r.status === 429 || r.status >= 500)) return r;
    // Retry-After may also be an HTTP date; that falls back to the backoff.
    const after = Number.parseInt(r.headers.get("retry-after") ?? "", 10);
    const seconds = Number.isNaN(after) ? 2 ** attempt : after;
    await new Promise((done) => setTimeout(done, seconds * 1000));
  }
}

/** Vectors for one call. Workers AI refuses a call whose texts are too long together
 * ("input too big", code 3030), so that call is split in half, and a single text that is
 * still too long is cut in half: the map places such a paper by the start of its abstract. */
async function embedBatch(url, token, texts) {
  const r = await post(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  if (r.ok) return (await r.json()).result.data.map(unit);
  const body = await r.text();
  if (r.status === 400 && body.includes("input too big")) {
    const mid = texts.length >> 1;
    if (mid)
      return [
        ...(await embedBatch(url, token, texts.slice(0, mid))),
        ...(await embedBatch(url, token, texts.slice(mid))),
      ];
    if (texts[0].length > 1000)
      return embedBatch(url, token, [texts[0].slice(0, texts[0].length >> 1)]);
  }
  throw new Error(`Workers AI: HTTP ${r.status} ${body}`);
}

/** One unit-length vector per text, in order. */
export async function embed(texts) {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!(account && token))
    throw new Error("set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to embed with Workers AI");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${EMBED_MODEL}`;
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH)
    out.push(...(await embedBatch(url, token, texts.slice(i, i + BATCH))));
  return out;
}
