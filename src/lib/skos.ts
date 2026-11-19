// The vocabulary as SKOS: vocabulary.yaml read through the shared JSON-LD
// context (vocabulary/context.jsonld), plus one skos:ConceptScheme per scheme.
// The site publishes the result at /vocabulary.ttl and /vocabulary.jsonld.
import { readFileSync } from "node:fs";
import jsonld from "jsonld";
import { Parser, Writer } from "n3";
import { type Concept, NAMESPACE, SCHEMES, type Scheme } from "../data/vocabulary";

const CONTEXT_FILE = "vocabulary/context.jsonld";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const DCT = "http://purl.org/dc/terms/";

/** The vocabulary as a JSON-LD document that uses the shared context. */
export function skosDocument(concepts: Concept[]) {
  const { "@context": context } = JSON.parse(readFileSync(CONTEXT_FILE, "utf8"));
  const top = (s: Scheme) =>
    concepts
      .filter((c) => c.scheme === s && !c.deprecated && !c.broader?.length)
      .map((c) => ({ "@id": NAMESPACE + c.id }));
  const schemes = Object.entries(SCHEMES).map(([s, { label, definition }]) => ({
    // NOTE: a relative "#id" because JSON-LD resolves a bare "lca" against
    // the base's path and drops its fragment, which would give /vocabulary/lca.
    id: `#${s}`,
    "@type": `${SKOS}ConceptScheme`,
    prefLabel: label,
    [`${DCT}description`]: definition,
    [`${DCT}license`]: { "@id": "https://creativecommons.org/licenses/by/4.0/" },
    "http://purl.org/vocab/vann/preferredNamespaceUri": { "@value": NAMESPACE },
    [`${SKOS}hasTopConcept`]: top(s as Scheme),
  }));
  const graph = concepts.map((c) => ({ ...c, id: `#${c.id}`, "@type": `${SKOS}Concept` }));
  return { "@context": context, "@graph": [...schemes, ...graph] };
}

/** The expanded JSON-LD, which needs no context to read. */
export function skosExpanded(concepts: Concept[]): Promise<object[]> {
  return jsonld.expand(skosDocument(concepts));
}

/** The vocabulary in Turtle, with the usual prefixes. */
export async function skosTurtle(concepts: Concept[]): Promise<string> {
  const nquads: string = await jsonld.toRDF(skosDocument(concepts), {
    format: "application/n-quads",
  });
  const writer = new Writer({
    prefixes: {
      ai4ie: NAMESPACE,
      dct: DCT,
      owl: "http://www.w3.org/2002/07/owl#",
      skos: SKOS,
      vann: "http://purl.org/vocab/vann/",
    },
  });
  writer.addQuads(new Parser({ format: "N-Quads" }).parse(nquads));
  return new Promise((resolve, reject) =>
    writer.end((error: Error | null, result: string) => (error ? reject(error) : resolve(result))),
  );
}
