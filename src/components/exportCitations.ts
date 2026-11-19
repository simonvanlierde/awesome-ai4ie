import type { LitEntry } from "../data/schemas";
import { type Citations, citationFile, type FORMATS } from "../lib/citations";

/** Build a citation download in the browser and return the screen-reader status line. */
export async function exportCitations(
  picked: LitEntry[],
  format: (typeof FORMATS)[number],
  name: string,
  loadCache: () => Promise<Citations> = async () =>
    (await import("../data/citations.json")).default,
): Promise<string> {
  try {
    const cache = await loadCache();
    const blob = new Blob([citationFile(picked, cache, format.key)], {
      type: `${format.mime};charset=utf-8`,
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.${format.ext}`;
    a.click();
    // Revoking in the same task can cancel the download in Firefox and Safari.
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    const n = picked.length;
    return `Exported ${n} ${n === 1 ? "entry" : "entries"} as ${format.label}`;
  } catch {
    return "Export failed, try again";
  }
}
