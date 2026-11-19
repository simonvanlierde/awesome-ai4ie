// The tag vocabulary as the site's code reads it, derived from vocabulary.yaml
// through the generated vocabulary.gen.ts. Four dimensions, each answering one
// question about an entry; the YAML calls them schemes:
//   ie     (field)      which IE field it serves: few, each with an ink
//   topic  (topic)      which system or problem it is about: no ink
//   ml     (technique)  which AI technique it uses
//   type   (type)       what kind of paper it is
// The IE fields follow the subject sections of the International Society for
// Industrial Ecology (https://is4ie.org/sections). A concern that cuts across
// fields (uncertainty) or a domain (water) is not an IE field: it goes in `ml`
// or `topic`, so the inks stay with the few fields. CONTRIBUTING.md ("The tag
// vocabulary") lists what else a new tag needs.
import { CONCEPTS } from "./vocabulary.gen";

type Concept = (typeof CONCEPTS)[number];
type Live = Exclude<Concept, { deprecated: true }>;
type LiveIn<S extends Concept["scheme"]> = Extract<Live, { scheme: S }>["id"];

export type IeTag = LiveIn<"field">;
export type TopicTag = LiveIn<"topic">;
export type MlTag = LiveIn<"technique">;
export type TypeTag = LiveIn<"type">;

const live = CONCEPTS.filter((c): c is Live => !("deprecated" in c));

/** Labels of the live concepts in one scheme, in the YAML's order (the display order). */
function labels<S extends Concept["scheme"]>(scheme: S) {
  return Object.fromEntries(
    live.filter((c) => c.scheme === scheme).map((c) => [c.id, c.prefLabel]),
  ) as Record<LiveIn<S>, string>;
}

export const IE_TAGS = labels("field");
export const TOPIC_TAGS = labels("topic");
export const ML_TAGS = labels("technique");
export const TYPE_TAGS = labels("type");

/** What a topic wants, one line each, shown in the map page's "Not mapped yet"
 * for every topic with fewer than THIN_TOPIC entries. Each names the work to
 * add, never what the list holds now, so it stays true as entries arrive. */
export const TOPIC_WANTED: Record<TopicTag, string> = {
  buildings: "Renovation and demolition flows, beyond stock models from imagery.",
  chemicals: "Characterisation factors for the tens of thousands of substances nobody has tested.",
  electronics: "Mostly identification and sorting; repair and reuse data are scarce.",
  metals: "Flows of minor metals, and the criticality and supply risk of each.",
  food: "Crop, land-use and food-waste footprints; the field remote sensing most obviously serves.",
  water: "Water footprints, scarcity factors, and water in MFA.",
  lifetime: "Survival analysis and failure prediction that feed stock models, and repair data.",
  energy:
    "Marginal versus average grid factors, temporal accounting, process and heat integration.",
  "supply-risk": "Supply risk, critical raw materials, trade-network disruption.",
};

/** A topic with fewer entries than this is listed as wanted on the map page. */
export const THIN_TOPIC = 3;

/** All four vocabularies by dimension. Key order is the curated display order. */
export const TAGS = { ie: IE_TAGS, topic: TOPIC_TAGS, ml: ML_TAGS, type: TYPE_TAGS } as const;
export type TagDim = keyof typeof TAGS;
export const TAG_DIMS = Object.keys(TAGS) as TagDim[];

/** Short names for Fig. 1 on the home page, whose labels must fit beside the
 * nodes at phone width: the `short` of each IE field and AI technique. */
export const SHORT_LABELS = Object.fromEntries(
  live.flatMap((c) => ("short" in c ? [[c.id, c.short]] : [])),
) as Record<IeTag | MlTag, string>;

/** Short label for an IE or ML tag; falls back to the slug. */
export function shortLabel(tag: string): string {
  return (SHORT_LABELS as Record<string, string>)[tag] ?? tag;
}

/** What each dimension is called in the UI. */
export const DIM_LABELS: Record<TagDim, string> = {
  ie: "IE field",
  topic: "Topic",
  ml: "AI technique",
  type: "Type",
};

/** Display label for a tag; falls back to the slug for a tag not in the vocabulary. */
export function tagLabel(dim: TagDim, tag: string): string {
  return (TAGS[dim] as Record<string, string>)[tag] ?? tag;
}

/** The literature dimension each scheme fills. */
export const DIM_OF_SCHEME: Record<Concept["scheme"], TagDim> = {
  field: "ie",
  topic: "topic",
  technique: "ml",
  type: "type",
};
const BY_ID = new Map<string, Concept>(CONCEPTS.map((c) => [c.id, c]));

/** Where a tag from an old URL lives now: a retired tag moves to its
 * replacement, and a tag that changed scheme (uncertainty was an IE field) to
 * its current dimension. A retired tag with no replacement gives null. A tag
 * the vocabulary does not know stays where it is. */
export function currentTag(dim: TagDim, tag: string): { dim: TagDim; tag: string } | null {
  const c = BY_ID.get(tag);
  if (!c) return { dim, tag };
  const now = "replacedBy" in c ? BY_ID.get(c.replacedBy) : "deprecated" in c ? undefined : c;
  return now ? { dim: DIM_OF_SCHEME[now.scheme], tag: now.id } : null;
}
