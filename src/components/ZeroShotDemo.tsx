import { useState } from "react";

type Result = { label: string; score: number };
type Classifier = (img: string, labels: string[]) => Promise<Result[]>;

const DEFAULT_LABELS = "intact appliance, corroded metal part, circuit board, plastic housing";

// transformers.js loads from the CDN on first classify (the `jsdelivr` entry is
// the bundled browser build). Keeping it out of package.json keeps ~340 MB of
// ONNX runtimes out of node_modules and a 23 MB wasm out of every deploy; the
// version is pinned here instead of in the lockfile.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

let classifierPromise: Promise<Classifier> | null = null;
function getClassifier(onProgress: (msg: string) => void): Promise<Classifier> {
  classifierPromise ??= import(/* @vite-ignore */ TRANSFORMERS_URL)
    .then(async ({ pipeline }) => {
      const pipe = await pipeline(
        "zero-shot-image-classification",
        "Xenova/clip-vit-base-patch32",
        {
          progress_callback: (p: { status: string; file?: string; progress?: number }) => {
            if (p.status === "progress" && p.file?.endsWith(".onnx"))
              onProgress(`downloading model… ${Math.round(p.progress ?? 0)}%`);
          },
        },
      );
      return (img: string, labels: string[]) => pipe(img, labels) as Promise<Result[]>;
    })
    .catch((err) => {
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

  function onFile(file: File | undefined) {
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setResults(null);
    setStatus(null);
  }

  async function classify() {
    if (!imageUrl) return;
    setBusy(true);
    setStatus("loading model (≈150 MB on first use, then cached)…");
    try {
      const classifier = await getClassifier(setStatus);
      setStatus("classifying…");
      const candidates = [
        ...new Set(
          labels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
        ),
      ];
      setResults(await classifier(imageUrl, candidates));
      setStatus(null);
    } catch (err) {
      setStatus(`failed to load or run the model: ${err instanceof Error ? err.message : err}`);
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
        <button type="button" onClick={classify} disabled={!imageUrl || busy}>
          Classify
        </button>
      </div>
      {imageUrl && <img src={imageUrl} alt="Your selected input" className="zsd-img" />}
      {status && (
        <p className="zsd-status" role="status">
          {status}
        </p>
      )}
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
