// The reading list as the /api/search Worker (worker/index.ts) ranks it. Entries carry
// their build-time vector when `pnpm run embed` ran before the build (src/lib/vectors.ts).
import { getCollection } from "astro:content";
import { entryText } from "../lib/semantic";
import { litUrl } from "../lib/urls";
import { loadVectors, textKey } from "../lib/vectors";

export async function GET() {
  const vectors = loadVectors();
  const entries = (await getCollection("literature")).map(({ id, data: e }) => {
    return {
      id,
      title: e.title,
      year: e.year,
      blurb: e.blurb,
      href: litUrl({ papers: [id] }),
      vector: vectors[textKey(entryText(e))],
    };
  });
  return Response.json(entries);
}
