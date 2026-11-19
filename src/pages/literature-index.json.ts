// The reading list as the Worker loads it (worker/search.ts): /api/search and the MCP tools
// rank and return these entries. An entry names its row in literature-vectors.bin when
// `pnpm run embed` ran before the build (src/lib/vectors.ts).
import { getCollection } from "astro:content";
import citations from "../data/citations.json";
import { entryText, type IndexEntry } from "../lib/semantic";
import { paperUrl } from "../lib/urls";
import { vectorRows } from "../lib/vectors";

export async function GET() {
  const literature = await getCollection("literature");
  const { rows } = vectorRows(literature.map(({ data }) => entryText(data)));
  const bibtex: Record<string, { bibtex: string } | undefined> = citations;
  const entries: IndexEntry[] = literature.map(({ id, data: e }, i) => ({
    id,
    title: e.title,
    authors: e.authors,
    etAl: e.etAl,
    year: e.year,
    doi: e.doi,
    arxiv: e.arxiv,
    blurb: e.blurb,
    ie: e.ie,
    topic: e.topic,
    ml: e.ml,
    type: e.type,
    status: e.status,
    href: paperUrl(id),
    bibtex: bibtex[id]?.bibtex,
    vectorRow: rows[i],
  }));
  return Response.json(entries);
}
