// The tag vocabulary in vocabulary.yaml: its schema, the four schemes, and the
// thin module (vocabulary.gen.ts) that the site and its islands import, so the
// browser bundle carries labels but not definitions. Node runs this file
// directly (scripts/vocabulary.mjs), so it imports nothing relative.
import { readFileSync } from "node:fs";
import { z } from "astro/zod";
import { parse } from "yaml";

export const VOCABULARY_FILE = "src/data/vocabulary.yaml";
export const GENERATED_FILE = "src/data/vocabulary.gen.ts";

/** Each concept's IRI is this plus its id. src/lib/skos.ts adds it as the JSON-LD base, since the shared context holds none. */
export const NAMESPACE = "https://ai4ie.org/vocabulary/#";

/** The schemes in display order, with the label and line the /vocabulary/ page shows. */
export const SCHEMES = {
  field: {
    label: "IE fields",
    definition:
      "The subject sections of the International Society for Industrial Ecology that an entry serves.",
  },
  topic: {
    label: "Topics",
    definition: "The system or problem an entry is about. A topic cuts across the fields.",
  },
  technique: { label: "AI techniques", definition: "The AI method an entry uses." },
  type: { label: "Entry types", definition: "What kind of paper an entry is." },
} as const;
export type Scheme = keyof typeof SCHEMES;

// Kebab-case, as in a URL fragment: /vocabulary/#<id>.
const conceptId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const oneLine = z.string().regex(/^[^\n]+$/);

export const conceptSchema = z.strictObject({
  id: conceptId,
  scheme: z.enum(Object.keys(SCHEMES) as [Scheme, ...Scheme[]]),
  prefLabel: oneLine,
  short: oneLine.optional(), // Fig. 1 on the home page; the start of prefLabel
  definition: oneLine.min(10).max(300),
  source: z.url().optional(),
  broader: z.array(conceptId).optional(),
  related: z.array(conceptId).optional(),
  exactMatch: z.array(z.url()).optional(), // the same concept elsewhere
  closeMatch: z.array(z.url()).optional(), // near enough to swap in some uses; OpenAlex topics
  deprecated: z.literal(true).optional(),
  replacedBy: conceptId.optional(),
  reserved: z.literal(true).optional(), // defined before any entry uses it
});
export type Concept = z.infer<typeof conceptSchema>;

export const vocabularySchema = z.array(conceptSchema);

export function readVocabulary(file = VOCABULARY_FILE): Concept[] {
  return vocabularySchema.parse(parse(readFileSync(file, "utf8")));
}

/** vocabulary.gen.ts for `concepts`: only the fields the site's code reads. */
export function renderGenerated(concepts: Concept[]): string {
  const rows = concepts.map(({ id, scheme, prefLabel, short, deprecated, replacedBy }) =>
    JSON.stringify({ id, scheme, prefLabel, short, deprecated, replacedBy }),
  );
  return [
    "// Generated from vocabulary.yaml by `pnpm run vocabulary`. Edit the YAML, then run it.",
    "export const CONCEPTS = [",
    ...rows.map((r) => `  ${r},`),
    "] as const;",
    "",
  ].join("\n");
}
