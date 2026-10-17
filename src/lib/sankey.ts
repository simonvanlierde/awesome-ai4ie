import { TAGS } from "../data/tags";

type Tagged = { ie?: readonly string[]; ml?: readonly string[] };

export type SankeyNode = { tag: string; count: number; y: number; h: number };
export type SankeyBand = {
  ie: string;
  ml: string;
  count: number;
  /** Top and height of the band where it leaves the IE node and enters the ML node. */
  y0: number;
  y1: number;
  h: number;
};

/**
 * Lays out IE field → AI technique flows for the cover figure: one band per
 * (ie, ml) pair that some entry carries, band height proportional to the number
 * of entries. An entry with two fields and two techniques counts in four bands,
 * so the totals are pairings, not papers. Both columns share one scale, stacked
 * in vocabulary order with `gap` between nodes, inside a column of `height`.
 */
export function sankeyLayout(entries: readonly Tagged[], height: number, gap: number) {
  const counts = new Map<string, number>();
  for (const e of entries)
    for (const ie of e.ie ?? [])
      for (const ml of e.ml ?? []) counts.set(`${ie}|${ml}`, (counts.get(`${ie}|${ml}`) ?? 0) + 1);

  const order = (dim: "ie" | "ml") => Object.keys(TAGS[dim]);
  const pairs = [...counts].map(([key, count]) => {
    const [ie, ml] = key.split("|");
    return { ie, ml, count };
  });
  const total = pairs.reduce((s, p) => s + p.count, 0);
  const side = (dim: "ie" | "ml") =>
    order(dim)
      .map((tag) => ({
        tag,
        count: pairs.filter((p) => p[dim] === tag).reduce((s, p) => s + p.count, 0),
      }))
      .filter((n) => n.count > 0);
  const ies = side("ie");
  const mls = side("ml");
  const k = total ? Math.min(...[ies, mls].map((s) => (height - gap * (s.length - 1)) / total)) : 0;

  const stack = (nodes: { tag: string; count: number }[]): SankeyNode[] => {
    let y = 0;
    return nodes.map((n) => {
      const node = { ...n, y, h: n.count * k };
      y += node.h + gap;
      return node;
    });
  };
  const ieNodes = stack(ies);
  const mlNodes = stack(mls);

  // Bands leave each IE node in technique order and enter each ML node in field
  // order, which keeps crossings to the ones the data forces.
  const rank = (dim: "ie" | "ml", tag: string) => order(dim).indexOf(tag);
  const out = new Map(ieNodes.map((n) => [n.tag, n.y]));
  const inn = new Map(mlNodes.map((n) => [n.tag, n.y]));
  const bands = new Map<string, SankeyBand>();
  for (const p of [...pairs].sort(
    (a, b) => rank("ie", a.ie) - rank("ie", b.ie) || rank("ml", a.ml) - rank("ml", b.ml),
  )) {
    const h = p.count * k;
    const y0 = out.get(p.ie) ?? 0;
    bands.set(`${p.ie}|${p.ml}`, { ...p, y0, y1: 0, h });
    out.set(p.ie, y0 + h);
  }
  for (const p of [...pairs].sort(
    (a, b) => rank("ml", a.ml) - rank("ml", b.ml) || rank("ie", a.ie) - rank("ie", b.ie),
  )) {
    const band = bands.get(`${p.ie}|${p.ml}`);
    if (!band) continue;
    band.y1 = inn.get(p.ml) ?? 0;
    inn.set(p.ml, band.y1 + band.h);
  }

  return { ieNodes, mlNodes, bands: [...bands.values()], total };
}
