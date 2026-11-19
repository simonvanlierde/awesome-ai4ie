// Embeds texts with the site's model, revision and transformers.js build, in Chromium,
// so scripts get the same vectors the browser computes. Needs a Chromium for
// Playwright (`pnpm exec playwright install chromium`) and the network for jsDelivr
// and Hugging Face.

// biome-ignore lint/correctness/noUnresolvedImports: playwright re-exports chromium from playwright-core, which Biome does not follow
import { chromium } from "playwright";
import { DTYPE, MODEL, MODEL_REVISION } from "../../src/lib/semantic.ts";
import { TRANSFORMERS_URL } from "../../src/lib/transformers.ts";

// A made-up https origin gives the page a secure context, so the model cache works.
const ORIGIN = "https://embed.invalid/";

/** One normalized vector per text, for each list in `lists`, from one model load. */
export async function embedInChromium(...lists) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(ORIGIN, (r) =>
      r.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
    );
    await page.goto(ORIGIN);
    return await page.evaluate(
      async ({ url, model, revision, dtype, textLists }) => {
        const { pipeline } = await import(url);
        const pipe = await pipeline("feature-extraction", model, { revision, dtype });
        const out = [];
        for (const texts of textLists)
          out.push((await pipe(texts, { pooling: "mean", normalize: true })).tolist());
        return out;
      },
      {
        url: TRANSFORMERS_URL,
        model: MODEL,
        revision: MODEL_REVISION,
        dtype: DTYPE,
        textLists: lists,
      },
    );
  } finally {
    await browser.close();
  }
}
