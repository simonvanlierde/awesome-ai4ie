// The reading list as the search dialog's meaning search reads it, fetched only
// after a reader turns that search on. Entries carry their build-time vector when
// `pnpm run embed` ran before the build (src/lib/vectors.ts).
import { getCollection } from "astro:content";
import { entryText } from "../lib/semantic";
import { litUrl } from "../lib/urls";
import { loadVectors, textKey } from "../lib/vectors";

export async function GET() {
  const vectors = loadVectors();
  const entries = (await getCollection("literature")).map(({ id, data: e }) => {
    const text = entryText(e);
    return {
      title: e.title,
      year: e.year,
      blurb: e.blurb,
      href: litUrl({ papers: [id] }),
      text,
      vector: vectors[textKey(text)],
    };
  });
  return Response.json(entries);
}
