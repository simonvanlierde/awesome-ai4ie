// The tag vocabulary as SKOS in expanded JSON-LD; /vocabulary/ links it.
import { readVocabulary } from "../data/vocabulary";
import { skosExpanded } from "../lib/skos";

export async function GET() {
  return new Response(JSON.stringify(await skosExpanded(readVocabulary())), {
    headers: { "content-type": "application/ld+json" },
  });
}
