// transformers.js loads from the CDN on first use (the `jsdelivr` entry is the
// bundled browser build). Keeping it out of package.json keeps ~340 MB of ONNX
// runtimes out of node_modules and a 23 MB wasm out of every deploy; the version
// is pinned here instead of in the lockfile.
// NOTE: the CSP in astro.config.mjs allows this exact URL and the onnxruntime-web build it
// loads; a version bump must update both there.
export const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

// A model load that sends no progress for this long counts as stalled (see withStall).
export const STALL_MS = 60_000;
