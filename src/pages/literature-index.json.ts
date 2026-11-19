// The reading list as the Worker loads it (worker/search.ts): /api/search and the MCP tools
// rank and return these entries. Entries carry their build-time vector when `pnpm run embed`
// ran before the build (src/lib/vectors.ts).
import { getCollection } from "astro:content";
import citations from "../data/citations.json";
import { entryText, type IndexEntry } from "../lib/semantic";
import { paperUrl } from "../lib/urls";
import { loadVectors, textKey } from "../lib/vectors";

export async function GET() {
  const vectors = loadVectors();
  const bibtex: Record<string, { bibtex: string } | undefined> = citations;
  const entries: IndexEntry[] = (await getCollection("literature")).map(({ id, data: e }) => ({
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
    vector: vectors[textKey(entryText(e))],
  }));
  return Response.json(entries);
}
