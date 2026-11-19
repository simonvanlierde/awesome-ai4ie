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
export function loadVectors(file = VECTORS_FILE): Record<string, string> {
  if (!existsSync(file)) return {};
  const data: VectorsFile = JSON.parse(readFileSync(file, "utf8"));
  return data.model === EMBED_MODEL ? data.vectors : {};
}

/** Encoded vectors for `texts` by text key. A text already in `stored` keeps its vector and
 * only the rest go to `embed` (not called at all when none is missing); keys of texts no
 * longer listed are dropped. */
export async function embedMissing(
  texts: string[],
  embed: (texts: string[]) => Promise<number[][]>,
  stored: Record<string, string> = loadVectors(),
): Promise<Record<string, string>> {
  const missing = [...new Set(texts.filter((t) => !(textKey(t) in stored)))];
  const fresh = missing.length ? await embed(missing) : [];
  const byKey = new Map(missing.map((t, i) => [textKey(t), encodeVector(fresh[i])]));
  return Object.fromEntries(
    texts.map((t) => [textKey(t), stored[textKey(t)] ?? byKey.get(textKey(t))]),
  );
}

/** The vectors for `entries` as the Worker loads them: each embedded entry's row in one
 * float32 file, by id, and that file's bytes. Rows follow the ids' sort order, not the
 * order given, so the index and the file agree however each caller lists the entries. */
export function vectorRows(
  entries: { id: string; text: string }[],
  stored: Record<string, string> = loadVectors(),
): { rows: Map<string, number>; bytes: Buffer } {
  const rows = new Map<string, number>();
  const found: Buffer[] = [];
  for (const { id, text } of [...entries].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const v = stored[textKey(text)];
    if (!v) continue;
    rows.set(id, found.length);
    found.push(Buffer.from(v, "base64"));
  }
  return { rows, bytes: Buffer.concat(found) };
}
