/**
 * The site's footprint as a small LCA: one page view, data transfer and hosting.
 * Page weights come from scripts/page-weight.mjs on the built site; the conversion
 * is the Sustainable Web Design model, version 4, in CO2.js (@tgwf/co2).
 */
import { co2 } from "@tgwf/co2";

const MB = 1e6;

// What one zero-shot demo run downloads (src/components/ZeroShotDemo.tsx). Bytes as served
// on 2026-11-26: the Hugging Face repo Xenova/clip-vit-base-patch32 at the pinned revision
// (the quantized ONNX file the browser's wasm backend loads, plus tokenizer and config),
// and from jsDelivr transformers.js 4.2.0 and the onnxruntime-web wasm it loads.
// NOTE: update by hand when MODEL, MODEL_REVISION or TRANSFORMERS_URL change.
export const DEMO_DOWNLOAD = {
  "model_quantized.onnx": 153_695_702,
  "tokenizer.json": 2_224_119,
  "vocab.json": 862_328,
  "merges.txt": 524_619,
  "config.json": 4_524,
  "tokenizer_config.json": 775,
  "special_tokens_map.json": 472,
  "preprocessor_config.json": 520,
  "transformers.js": 1_285_352,
  "ort-wasm-simd-threaded.asyncify.wasm": 23_567_050,
};

const swd = new co2({ model: "swd", version: 4 });
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Numbers for the footprint page from page-weight rows ({page, kb}, gzipped first visit).
 * Grams CO2e are for the `hosting` case: a green host (low) or not (high).
 */
export function footprint(rows) {
  const bytes = rows.map((r) => r.kb * 1024);
  const view = (b, green) => swd.perByte(b, green);
  const viewBytes = mean(bytes);
  const demoBytes = Object.values(DEMO_DOWNLOAD).reduce((a, b) => a + b, 0);
  const g = (b) => ({ low: view(b, true), high: view(b, false) });
  return {
    pages: rows.length,
    viewKb: viewBytes / 1024,
    minKb: Math.min(...bytes) / 1024,
    maxKb: Math.max(...bytes) / 1024,
    demoMb: demoBytes / MB,
    view: g(viewBytes),
    demo: g(demoBytes),
    // Views whose transfer equals one demo run.
    viewsPerDemo: demoBytes / viewBytes,
  };
}

const mg = (grams) => `${(grams * 1000).toFixed(grams * 1000 < 10 ? 1 : 0)} mg`;
const range = (r, f) => `${f(r.low)} to ${f(r.high)}`;
const rounded = (n) => Math.round(n / 10) * 10;

/** The page's `%%fp:name%%` tokens and their text. */
export function footprintTokens(f) {
  return {
    pages: String(f.pages),
    viewKb: f.viewKb.toFixed(0),
    minKb: f.minKb.toFixed(0),
    maxKb: f.maxKb.toFixed(0),
    demoMb: f.demoMb.toFixed(0),
    onnxMb: (DEMO_DOWNLOAD["model_quantized.onnx"] / MB).toFixed(0),
    view: range(f.view, mg),
    thousandViews: range(
      { low: f.view.low * 1000, high: f.view.high * 1000 },
      (g) => `${g.toFixed(0)} g`,
    ),
    demo: range(f.demo, (g) => `${g.toFixed(0)} g`),
    viewsPerDemo: rounded(f.viewsPerDemo).toLocaleString("en"),
    verdict:
      f.viewsPerDemo >= 2000
        ? "The finding holds: one demo run outweighs thousands of page views."
        : f.viewsPerDemo >= 500
          ? "The finding holds, but the count is about a thousand page views, not several thousand."
          : "The finding does not hold: one demo run outweighs fewer than 500 page views.",
  };
}

/** `html` with each `%%fp:name%%` replaced; throws on a token with no value. */
export function fillTokens(html, tokens) {
  return html.replace(/%%fp:(\w+)%%/g, (_, name) => {
    if (!(name in tokens)) throw new Error(`footprint page: no value for %%fp:${name}%%`);
    return tokens[name];
  });
}
