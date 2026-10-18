import { TAGS } from "../data/tags";

type App = { id: string; ie: string[]; ml: string[] };

/** Sorts tags in vocabulary order (their order in tags.ts), so grouped lists
 * and grid axes show a dimension in the same order, whatever order the data
 * uses. */
const byVocabulary = (dim: "ie" | "ml") => {
  const order = Object.keys(TAGS[dim]);
  return (a: string, b: string) => order.indexOf(a) - order.indexOf(b);
};

/** Group applications by one tag dimension; multi-tagged entries appear in every group. */
export function groupBy<T extends App>(entries: T[], dim: "ie" | "ml"): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const e of entries)
    for (const t of e[dim]) {
      const group = m.get(t);
      if (group) group.push(e);
      else m.set(t, [e]);
    }
  return new Map([...m].sort(([a], [b]) => byVocabulary(dim)(a, b)));
}

/** IE × ML grid; only rows/cols with at least one entry, cells keyed "ie|ml".
 * Rows and cols come back in vocabulary order. */
export function toGrid<T extends App>(entries: T[]) {
  const cells = new Map<string, T[]>();
  for (const e of entries)
    for (const ie of e.ie)
      for (const ml of e.ml) {
        const key = `${ie}|${ml}`;
        const cell = cells.get(key);
        if (cell) cell.push(e);
        else cells.set(key, [e]);
      }
  const rows = [...new Set(entries.flatMap((e) => e.ie))].sort(byVocabulary("ie"));
  const cols = [...new Set(entries.flatMap((e) => e.ml))].sort(byVocabulary("ml"));
  return { rows, cols, cells };
}
