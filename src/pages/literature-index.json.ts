// The reading list as the search dialog's meaning search reads it, fetched only
// after a reader turns that search on.
import { getCollection } from "astro:content";
import { entryText } from "../lib/semantic";
import { litUrl } from "../lib/urls";

export async function GET() {
  const entries = (await getCollection("literature")).map(({ id, data: e }) => ({
    title: e.title,
    year: e.year,
    blurb: e.blurb,
    href: litUrl({ papers: [id] }),
    text: entryText(e),
  }));
  return Response.json(entries);
}
