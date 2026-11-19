// Build-time entry vectors for meaning search (Node only). `pnpm run embed` writes
// them; literature-vectors.bin ships each entry's vector when its text and the model
// still match, and literature-index.json names its row. An entry with none is left out
// of meaning search.
// biome-ignore lint/correctness/noNodejsModules: build-time only, never bundled for the browser
import { createHash } from "node:crypto";
// biome-ignore lint/correctness/noNodejsModules: build-time only, never bundled for the browser
import { existsSync, readFileSync } from "node:fs";
import { EMBED_MODEL } from "./semantic.ts";

/** Generated, not committed (see .gitignore). */
export const VECTORS_FILE = "src/data/literature-vectors.json";

type VectorsFile = { model: string; vectors: Record<string, string> };

/** Key of an entry's embedded text, so an edited entry drops its stale vector. */
export function textKey(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** A vector as base64 of its float32 bytes, the form literature-vectors.json stores. */
export function encodeVector(v: number[]): string {
  return Buffer.from(Float32Array.from(v).buffer).toString("base64");
}

/** Vectors by text key, or an empty map when the file is missing or from another model,
 * since a model change makes every stored vector stale. */
export function loadVectors(): Record<string, string> {
  if (!existsSync(VECTORS_FILE)) return {};
  const data: VectorsFile = JSON.parse(readFileSync(VECTORS_FILE, "utf8"));
  return data.model === EMBED_MODEL ? data.vectors : {};
}

/** The vectors for `texts` as the Worker loads them: each text's row in one float32 file
 * (undefined for a text without a vector), and that file's bytes, rows in text order. */
export function vectorRows(texts: string[]): { rows: (number | undefined)[]; bytes: Buffer } {
  const stored = loadVectors();
  const found: Buffer[] = [];
  const rows = texts.map((t) => {
    const v = stored[textKey(t)];
    if (!v) return undefined;
    found.push(Buffer.from(v, "base64"));
    return found.length - 1;
  });
  return { rows, bytes: Buffer.concat(found) };
}
