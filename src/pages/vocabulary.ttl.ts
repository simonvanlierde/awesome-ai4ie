// The tag vocabulary as SKOS in Turtle; /vocabulary/ links it.
import { readVocabulary } from "../data/vocabulary";
import { skosTurtle } from "../lib/skos";

export async function GET() {
  return new Response(await skosTurtle(readVocabulary()), {
    headers: { "content-type": "text/turtle; charset=utf-8" },
  });
}
