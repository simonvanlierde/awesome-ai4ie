// Embeds texts with the meaning-search model through the Workers AI REST API, so
// scripts get the same vectors the site's /api/embed Worker returns. Needs
// CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token with Workers AI read).

import process from "node:process";
import { EMBED_MODEL, EMBED_POOLING, unit } from "../../src/lib/semantic.ts";

// Workers AI takes at most 100 texts per embedding call.
const BATCH = 100;

/** One unit-length vector per text, in order. */
export async function embed(texts) {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!(account && token))
    throw new Error("set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to embed with Workers AI");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${EMBED_MODEL}`;
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ text: texts.slice(i, i + BATCH), pooling: EMBED_POOLING }),
    });
    if (!r.ok) throw new Error(`Workers AI: HTTP ${r.status} ${await r.text()}`);
    out.push(...(await r.json()).result.data.map(unit));
  }
  return out;
}
