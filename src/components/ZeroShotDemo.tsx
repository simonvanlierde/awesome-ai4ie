import { useEffect, useState } from "react";
import { StalledError, withStall } from "../lib/stall";

type Result = { label: string; score: number };
type Classifier = (img: string, labels: string[]) => Promise<Result[]>;

const DEFAULT_LABELS = "intact appliance, corroded metal part, circuit board, plastic housing";

// transformers.js loads from the CDN on first classify (the `jsdelivr` entry is
// the bundled browser build). Keeping it out of package.json keeps ~340 MB of
// ONNX runtimes out of node_modules and a 23 MB wasm out of every deploy; the
// version is pinned here instead of in the lockfile.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";
// The model is pinned to a commit of its Hugging Face repo, so a later push to
// that repo cannot change the files every visitor runs. (For its progress bar
// the library also asks `main` for each file's size; those bytes are not used.)
const MODEL = "Xenova/clip-vit-base-patch32";
// biome-ignore lint/security/noSecrets: a public git commit id, not a secret
const MODEL_REVISION = "d15189d7028b43f1d3e65039190477f6af591c2a";

// A load that sends no progress for this long counts as stalled (see withStall).
const STALL_MS = 60_000;

let classifierPromise: Promise<Classifier> | null = null;
function getClassifier(onProgress: (msg: string) => void): Promise<Classifier> {
  classifierPromise ??= withStall(async (alive) => {
    const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_URL);
    alive();
    const pipe = await pipeline("zero-shot-image-classification", MODEL, {
      revision: MODEL_REVISION,
      progress_callback: (p: { status: string; file?: string; progress?: number }) => {
        // After a stall the download keeps going; its progress must not
        // overwrite the message that told the reader it stopped.
        if (!alive()) return;
        if (p.status === "progress" && p.file?.endsWith(".onnx"))
          onProgress(`Downloading the model… ${Math.round(p.progress ?? 0)}%`);
      },
    });
    return (img: string, labels: string[]) => pipe(img, labels) as Promise<Result[]>;
  }, STALL_MS).catch((err) => {
    classifierPromise = null; // a failed load must not poison every retry
    throw err;
  });
  return classifierPromise;
}

/**
 * Zero-shot image classification (CLIP), running entirely in the browser via
 * transformers.js. The photo never leaves the machine, which is the point of the demo.
 */
export default function ZeroShotDemo() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  // Free the last photo's object URL when the demo leaves the page.
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);

  function onFile(file: File | undefined) {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setResults(null);
    setStatus(null);
  }

  async function classify() {
    if (!imageUrl) {
      setStatus("Pick a photo first.");
      return;
    }
    if (busy) return;
    const candidates = [
      ...new Set(
        labels
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
      ),
    ];
    if (candidates.length === 0) {
      setStatus("Add at least one label, separated by commas.");
      return;
    }
    setBusy(true);
    setStatus("Loading the model (≈150 MB on first use, then cached)…");
    try {
      const classifier = await getClassifier(setStatus);
      setStatus("Classifying…");
      const scored = await classifier(imageUrl, candidates);
      setResults(scored);
      setStatus(`Done: ${scored[0].label} scores highest, ${(scored[0].score * 100).toFixed(1)}%.`);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: the status line cannot show the cause; the console keeps it for debugging
      console.error(err);
      setStatus(
        err instanceof StalledError
          ? "The model download stopped making progress. Check your connection, then press Classify to try again."
          : "Could not load or run the model. Check your connection, then press Classify to try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zsd not-content">
      <div className="zsd-controls">
        <label className="zsd-labels">
          Image to classify
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <label className="zsd-labels">
          Candidate labels, comma-separated
          <input type="text" value={labels} onChange={(e) => setLabels(e.target.value)} />
        </label>
        <button
          type="button"
          onClick={classify}
          // Not `disabled`: a disabled button drops keyboard focus to the page
          // while the model loads. The guard in classify() does the job instead.
          aria-disabled={!imageUrl || busy}
          aria-describedby="zsd-hint"
        >
          Classify
        </button>
        <p className="zsd-hint" id="zsd-hint">
          {imageUrl
            ? "The first run loads code from cdn.jsdelivr.net and the CLIP model (≈150 MB) from huggingface.co and its download host hf.co. The model then stays in this browser's cache until you clear the site's data."
            : "Pick a photo to enable Classify. The first run then loads code from cdn.jsdelivr.net and the CLIP model (≈150 MB) from huggingface.co and its download host hf.co."}
        </p>
      </div>
      {imageUrl && <img src={imageUrl} alt="Your selected input" className="zsd-img" />}
      {/* Always mounted: screen readers announce changes to a live region that
          already exists, not one inserted together with its text. */}
      <p className="zsd-status" role="status">
        {status}
      </p>
      {results && (
        <ul className="zsd-results">
          {results.map((r) => (
            <li key={r.label}>
              <span className="zsd-result-label">{r.label}</span>
              <span className="zsd-bar" style={{ width: `${Math.round(r.score * 100)}%` }} />
              <span className="zsd-score">{(r.score * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
