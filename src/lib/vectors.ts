// Build-time entry vectors for meaning search (Node only). `pnpm run embed` writes
// them; literature-index.json ships each entry's vector when its text and the model
// revision still match, and the browser embeds any entry that has none.
// biome-ignore lint/correctness/noNodejsModules: build-time only, never bundled for the browser
import { createHash } from "node:crypto";
// biome-ignore lint/correctness/noNodejsModules: build-time only, never bundled for the browser
import { existsSync, readFileSync } from "node:fs";
import { MODEL_REVISION } from "./semantic.ts";

/** Generated, not committed (see .gitignore). */
export const VECTORS_FILE = "src/data/literature-vectors.json";

type VectorsFile = { revision: string; vectors: Record<string, string> };

/** Key of an entry's embedded text, so an edited entry drops its stale vector. */
export function textKey(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** A vector as base64 of its float32 bytes, the form the index ships. */
export function encodeVector(v: number[]): string {
  return Buffer.from(Float32Array.from(v).buffer).toString("base64");
}

/** Vectors by text key, or an empty map when the file is missing or for another model revision. */
export function loadVectors(file = VECTORS_FILE): Record<string, string> {
  if (!existsSync(file)) return {};
  const data: VectorsFile = JSON.parse(readFileSync(file, "utf8"));
  return data.revision === MODEL_REVISION ? data.vectors : {};
}
