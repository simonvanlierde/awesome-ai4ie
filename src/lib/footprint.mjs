/**
 * The site's footprint as a small LCA: one page view, data transfer and hosting.
 * Page weights come from scripts/page-weight.mjs on the built site; the conversion
 * is the Sustainable Web Design model, version 4, in CO2.js (@tgwf/co2).
 */
import { co2 } from "@tgwf/co2";

// Decimal units, as page-weight.mjs reports them: 1,000 views of 190 kB make 190 MB.
const KB = 1e3;
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

// `results: "segment"` makes perByte return the split by data centre, network and device.
const swd = new co2({ model: "swd", version: 4, results: "segment" });
const GB = 1e9;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** A {low, high} pair: the green-host case and the other one. */
const both = (f) => ({ low: f(true), high: f(false) });
const grams = (bytes) => both((green) => swd.perByte(bytes, green).total);
const perGb = (part) => both((green) => swd.perByte(GB, green)[part]);

/** The SWD v4 background per GB, split by segment. CO2.js applies the green-host factor
 * to the total only, so the data centre's green value is what the others leave. */
function background() {
  const [network, device, deviceEmbodied, total] = [
    "networkCO2e",
    "consumerDeviceCO2e",
    "consumerDeviceEmbodiedCO2e",
    "total",
  ].map(perGb);
  const dataCentre = {
    low: total.low - network.low - device.low,
    high: perGb("dataCenterCO2e").high,
  };
  return { dataCentre, network, device, deviceEmbodied, total };
}

/**
 * Numbers for the footprint page from page-weight rows ({page, kb, budget?} in kB, gzipped
 * first visit). Grams CO₂e are {low, high}: a green host or not.
 */
export function footprint(rows) {
  if (rows.length === 0) throw new Error("footprint: no page-weight rows");
  const sorted = rows.toSorted((a, b) => b.kb - a.kb);
  const bytes = sorted.map((r) => r.kb * KB);
  const viewBytes = mean(bytes);
  const demoBytes = Object.values(DEMO_DOWNLOAD).reduce((a, b) => a + b, 0);
  return {
    pages: rows.length,
    rows: sorted.map((r) => ({ ...r, co2: grams(r.kb * KB) })),
    viewKb: viewBytes / KB,
    minKb: Math.min(...bytes) / KB,
    maxKb: Math.max(...bytes) / KB,
    demoMb: demoBytes / MB,
    view: grams(viewBytes),
    thousandViews: grams(viewBytes * 1000),
    demo: grams(demoBytes),
    // Views whose transfer equals one demo run.
    viewsPerDemo: demoBytes / viewBytes,
    // The SWD v4 background per GB transferred.
    perGb: background(),
    gridIntensity: swd.perByteTrace(GB).variables.gridIntensity.network.value,
  };
}

const mg = (x) => `${(x * 1000).toFixed(x * 1000 < 10 ? 1 : 0)} mg`;
const g = (x) => `${x.toFixed(0)} g`;
const range = (r, f) => `${f(r.low)} to ${f(r.high)}`;
const rounded = (n) => Math.round(n / 10) * 10;
const perGbText = (r) => {
  const [low, high] = [r.low, r.high].map((x) => x.toFixed(0));
  return low === high ? `${high} g/GB` : `${low} to ${high} g/GB`;
};

/** The page's `%%fp:name%%` tokens and their text; `self` is the footprint page's path. */
export function footprintTokens(f, self = "footprint/index.html") {
  return {
    pages: String(f.pages),
    viewKb: f.viewKb.toFixed(0),
    minKb: f.minKb.toFixed(0),
    maxKb: f.maxKb.toFixed(0),
    thousandMb: ((f.viewKb * KB * 1000) / MB).toFixed(0),
    demoMb: f.demoMb.toFixed(0),
    onnxMb: (DEMO_DOWNLOAD["model_quantized.onnx"] / MB).toFixed(0),
    view: range(f.view, mg),
    thousandViews: range(f.thousandViews, g),
    demo: range(f.demo, g),
    viewsPerDemo: rounded(f.viewsPerDemo).toLocaleString("en"),
    dataCentreGb: perGbText(f.perGb.dataCentre),
    networkGb: perGbText(f.perGb.network),
    deviceGb: perGbText(f.perGb.device),
    totalGb: perGbText(f.perGb.total),
    deviceShare: `${((f.perGb.device.high / f.perGb.total.high) * 100).toFixed(0)}%`,
    deviceEmbodiedShare: `${((f.perGb.deviceEmbodied.high / f.perGb.device.high) * 100).toFixed(0)}%`,
    gridIntensity: String(f.gridIntensity),
    pageFigure: pageFigure(f, self),
    compareFigure: compareFigure(f),
  };
}

const SPECIAL = /[&<>"]/g;
const INDEX_HTML = /index\.html$/;
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(SPECIAL, (c) => ESC[c]);
const pct = (x, max) => `${((x / max) * 100).toFixed(2)}%`;
const urlOf = (page) => (page === "index.html" ? "/ (home)" : `/${page.replace(INDEX_HTML, "")}`);

/** One bar row: the name and value as text, the bar hidden from screen readers. */
const row = (name, value, track, cls = "") =>
  `<li${cls && ` class="${cls}"`}><span class="fp-name">${name}</span>` +
  `<span class="fp-val">${value}</span>` +
  `<span class="fp-track" aria-hidden="true">${track}</span></li>`;

/** Fig. 5's bar list: each page's weight against its budget, heaviest first. */
export function pageFigure(f, self) {
  const max = Math.max(...f.rows.map((r) => Math.max(r.kb, r.budget ?? 0)));
  return `<ol class="fp-bars">${f.rows
    .map((r) => {
      const budget = r.budget ? `<span class="sr-only">, budget ${r.budget} kB</span>` : "";
      const tick = r.budget
        ? `<span class="fp-limit" style="--x:${pct(r.budget, max)}"></span>`
        : "";
      return row(
        esc(urlOf(r.page)) + (r.page === self ? " (this page)" : ""),
        `${r.kb.toFixed(0)} kB${budget}, ${range(r.co2, mg)}`,
        `<span class="fp-bar" style="--w:${pct(r.kb, max)}"></span>${tick}`,
      );
    })
    .join("")}</ol>`;
}

/** Fig. 4's bar list: one view, 1,000 views and one demo run on one linear scale of grams. */
export function compareFigure(f) {
  const units = [
    ["One page view", f.view],
    ["1,000 page views", f.thousandViews],
    ["One demo run", f.demo],
  ];
  const max = Math.max(...units.map(([, r]) => r.high));
  const fixed = (x) => x.toFixed(x < 1 ? 3 : 0);
  return `<ol class="fp-bars fp-compare">${units
    .map(([name, r]) =>
      row(
        name,
        `${fixed(r.low)} to ${fixed(r.high)} g`,
        `<span class="fp-bar" style="--w:${pct(r.low, max)}"></span>` +
          `<span class="fp-bar fp-bar--high" style="--w:${pct(r.high - r.low, max)}"></span>`,
      ),
    )
    .join("")}</ol>`;
}

/** `html` with each `%%fp:name%%` replaced; throws on a token with no value. */
export function fillTokens(html, tokens) {
  return html.replace(/%%fp:(\w+)%%/g, (_, name) => {
    if (!(name in tokens)) throw new Error(`footprint page: no value for %%fp:${name}%%`);
    return tokens[name];
  });
}
