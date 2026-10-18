import { TAGS } from "../data/tags";

type Tagged = { ie?: readonly string[]; ml?: readonly string[] };

export type SankeyNode = {
  tag: string;
  /** Pairings through this node: sets the node's height, so its bands fit. */
  count: number;
  /** Distinct papers in the flow that carry this tag: the number a reader sees. */
  papers: number;
  y: number;
  h: number;
};
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
 * Lays out IE field → AI technique flows for the cover figure. Only entries
 * with both an IE field and an AI technique take part (`papers` counts them).
 * One band per (ie, ml) pair, its height proportional to the entries carrying
 * that pair: an entry with two fields and two techniques sits in four bands, so
 * band and node heights count pairings (`total`), while each node's `papers` is
 * the number of distinct entries, which is what the filtered literature list
 * shows. Both columns share one scale, stacked in vocabulary order with `gap`
 * between nodes, inside a column of `height`.
 */
export function sankeyLayout(entries: readonly Tagged[], height: number, gap: number) {
  // A tag listed twice on one entry still counts once, as the literature filter does.
  const flow = entries
    .map((e) => ({ ie: [...new Set(e.ie ?? [])], ml: [...new Set(e.ml ?? [])] }))
    .filter((e) => e.ie.length > 0 && e.ml.length > 0);

  const counts = new Map<string, number>();
  for (const e of flow)
    for (const ie of e.ie)
      for (const ml of e.ml) counts.set(`${ie}|${ml}`, (counts.get(`${ie}|${ml}`) ?? 0) + 1);

  const order = { ie: Object.keys(TAGS.ie), ml: Object.keys(TAGS.ml) };
  const pairs = [...counts].map(([key, count]) => {
    const [ie, ml] = key.split("|");
    return { ie, ml, count };
  });
  const total = pairs.reduce((s, p) => s + p.count, 0);
  const side = (dim: "ie" | "ml") =>
    order[dim]
      .map((tag) => ({
        tag,
        count: pairs.filter((p) => p[dim] === tag).reduce((s, p) => s + p.count, 0),
        papers: flow.filter((e) => e[dim].includes(tag)).length,
      }))
      .filter((n) => n.count > 0);
  const ies = side("ie");
  const mls = side("ml");
  const k = total ? Math.min(...[ies, mls].map((s) => (height - gap * (s.length - 1)) / total)) : 0;

  const stack = (nodes: Omit<SankeyNode, "y" | "h">[]): SankeyNode[] => {
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
  const rank = (dim: "ie" | "ml", tag: string) => order[dim].indexOf(tag);
  const out = new Map(ieNodes.map((n) => [n.tag, n.y]));
  const inn = new Map(mlNodes.map((n) => [n.tag, n.y]));
  const bands = pairs
    .sort((a, b) => rank("ie", a.ie) - rank("ie", b.ie) || rank("ml", a.ml) - rank("ml", b.ml))
    .map((p): SankeyBand => {
      const h = p.count * k;
      const y0 = out.get(p.ie) ?? 0;
      out.set(p.ie, y0 + h);
      return { ...p, y0, y1: 0, h };
    });
  for (const band of [...bands].sort(
    (a, b) => rank("ml", a.ml) - rank("ml", b.ml) || rank("ie", a.ie) - rank("ie", b.ie),
  )) {
    band.y1 = inn.get(band.ml) ?? 0;
    inn.set(band.ml, band.y1 + band.h);
  }

  return { ieNodes, mlNodes, bands, total, papers: flow.length };
}
