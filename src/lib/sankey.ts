import { TAGS } from "../data/tags";

type Tagged = {
  ie?: readonly string[];
  ml?: readonly string[];
  topic?: readonly string[];
};

export type TopicLens = {
  tag: string;
  /** Distinct papers in the flow that carry this topic. */
  papers: number;
  /** Distinct IE fields reached by this topic's papers in the flow. */
  fields: number;
  /** Matching `ie|ml` band keys, deduplicated. */
  bands: string[];
};

function flowEntries(entries: readonly Tagged[]) {
  // A tag listed twice on one entry still counts once, as the literature filter does.
  return entries
    .map((e) => ({
      ie: [...new Set(e.ie ?? [])],
      ml: [...new Set(e.ml ?? [])],
      topic: [...new Set(e.topic ?? [])],
    }))
    .filter((e) => e.ie.length > 0 && e.ml.length > 0);
}

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
 * Lays out the IE field → AI technique flow for Fig. 1. Only entries with both
 * an IE field and an AI technique take part; `papers` counts them. Each
 * (ie, ml) pair gets one band, its height proportional to the entries that
 * carry the pair. An entry with two fields and two techniques sits in four
 * bands, so band and node heights count pairings (`total`). A node's `papers`
 * counts distinct entries, which is what the filtered literature list shows.
 * Both columns share one scale and stack in vocabulary order. The column
 * with more nodes sits `gap` apart and sets the scale; the other spreads its
 * spare height over wider gaps, so both columns span the full `height` (a
 * one-node column does not).
 */
export function sankeyLayout(entries: readonly Tagged[], height: number, gap: number) {
  const flow = flowEntries(entries);

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
    const spread = nodes.length > 1 ? (height - total * k) / (nodes.length - 1) : 0;
    let y = 0;
    return nodes.map((n) => {
      const node = { ...n, y, h: n.count * k };
      y += node.h + spread;
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

/** Per-topic reach across Fig. 1, in vocabulary order, omitting topics with no
 * paper in the flow. Only entries with both an IE field and an AI technique
 * take part, matching sankeyLayout. */
export function topicLenses(entries: readonly Tagged[]): TopicLens[] {
  const flow = flowEntries(entries);
  const lenses: TopicLens[] = [];
  for (const tag of Object.keys(TAGS.topic)) {
    const matched = flow.filter((e) => e.topic.includes(tag));
    if (matched.length === 0) continue;
    const fields = new Set<string>();
    const bands = new Set<string>();
    for (const e of matched) {
      for (const ie of e.ie) {
        fields.add(ie);
        for (const ml of e.ml) {
          bands.add(`${ie}|${ml}`);
        }
      }
    }
    lenses.push({
      tag,
      papers: matched.length,
      fields: fields.size,
      bands: [...bands],
    });
  }
  return lenses;
}

type Ends = { y0: number; y1: number; h: number };

/** A band's outline from x `a` to x `b`: two horizontal-tangent curves, one per edge. */
export function bandPath(a: number, b: number, { y0, y1, h }: Ends): string {
  const mid = (a + b) / 2;
  return `M${a} ${y0}C${mid} ${y0} ${mid} ${y1} ${b} ${y1}V${y1 + h}C${mid} ${y1 + h} ${mid} ${y0 + h} ${a} ${y0 + h}Z`;
}

/** The curve through a band's middle, which the entrance mask strokes along. */
export function spinePath(a: number, b: number, { y0, y1, h }: Ends): string {
  const mid = (a + b) / 2;
  return `M${a} ${y0 + h / 2}C${mid} ${y0 + h / 2} ${mid} ${y1 + h / 2} ${b} ${y1 + h / 2}`;
}
