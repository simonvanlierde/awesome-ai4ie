import { withStall } from "./stall";

// transformers.js loads from the CDN on first use (the `jsdelivr` entry is the
// bundled browser build). Keeping it out of package.json keeps ~340 MB of ONNX
// runtimes out of node_modules and a 23 MB wasm out of every deploy; the version
// is pinned here instead of in the lockfile.
// NOTE: the CSP in astro.config.mjs allows this exact URL and the onnxruntime-web build it
// loads; a version bump must update both there.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

// A model load that sends no progress for this long counts as stalled (see withStall).
const STALL_MS = 60_000;

type Progress = { status: string; file?: string; progress?: number };

/**
 * Loads a transformers.js pipeline from the CDN, with the model pinned to a commit
 * of its Hugging Face repo so a later push there cannot change what visitors run.
 * Reports the model download as "Downloading the model… N%" in 10% steps (each
 * one is announced by a status live region). Rejects with StalledError when the
 * download stops making progress; the caller resets its cache so a retry starts over.
 */
export function loadPipeline<P>(
  task: string,
  model: string,
  revision: string,
  onProgress: (msg: string) => void,
  options: Record<string, unknown> = {},
): Promise<P> {
  return withStall(async (alive) => {
    const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_URL);
    alive();
    let shown = -1;
    return pipeline(task, model, {
      ...options,
      revision,
      progress_callback: (p: Progress) => {
        // After a stall the download keeps going; its progress must not
        // overwrite the message that told the reader it stopped.
        if (!alive()) return;
        if (p.status !== "progress" || !p.file?.endsWith(".onnx")) return;
        const step = Math.floor((p.progress ?? 0) / 10) * 10;
        if (step === shown) return;
        shown = step;
        onProgress(`Downloading the model… ${step}%`);
      },
    });
  }, STALL_MS);
}
