// Shared tag vocabulary for the literature list, the applications map and the
// data schemas. Four facets, each answering one question about an entry:
//   ie     which IE field it serves: few, each with an ink
//   topic  which system or problem it is about (chemicals, water, ...): no ink
//   ml     which AI technique it uses
//   type   what kind of paper it is
// The IE fields follow the subject sections of the International Society for
// Industrial Ecology (https://is4ie.org/sections). Socio-economic metabolism is
// the umbrella for MFA and stock models (Pauliuk & Hertwich 2015,
// https://doi.org/10.1016/j.ecolecon.2015.08.012). A concern that
// cuts across fields (uncertainty) or a domain (water) is not an IE field: it goes
// in `ml` or `topic`, so the inks stay with the few fields.
// Add a tag here first: the collections test rejects data that uses a tag not
// defined here. A new IE field also needs a `.field-<tag>` ink rule in
// src/styles/custom.css (the inks are in DESIGN.md), a section on the map page,
// and its own page at src/content/docs/applications-map/<tag>.mdx (definition,
// <FieldPage>, gaps); chapters.test.ts checks all three. The issue forms in
// .github/ISSUE_TEMPLATE/ list the labels too; forms.test.ts checks them. Add a
// tag together with its first vetted entry, not before.
export const IE_TAGS = {
  lca: "Life cycle assessment",
  sem: "Socio-economic metabolism",
  eeio: "Input-output",
  circular: "Circular economy",
  symbiosis: "Industrial symbiosis",
} as const;

export const TOPIC_TAGS = {
  buildings: "Buildings & construction",
  chemicals: "Chemicals & toxicity",
  electronics: "Electronics & e-waste",
  metals: "Metals & critical materials",
  food: "Agriculture & food",
  water: "Water",
  lifetime: "Product lifetime, reuse & repair",
  energy: "Energy & industrial decarbonisation",
  "supply-risk": "Supply chains & resource security",
} as const;

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

export const ML_TAGS = {
  llm: "LLMs & agents",
  "nlp-extraction": "NLP & information extraction",
  cv: "Computer vision",
  segmentation: "Detection & segmentation",
  depth: "Depth & 3D geometry",
  "remote-sensing": "Remote sensing",
  "tabular-ml": "Tabular ML & regression",
  generative: "Generative models",
  foundation: "Foundation models & transformers",
  "anomaly-detection": "Anomaly & condition detection",
  uncertainty: "Uncertainty & probabilistic ML",
} as const;

export const TYPE_TAGS = {
  "landmark-ml": "ML landmark",
  meta: "Research practice",
  review: "Review",
  method: "Method",
  dataset: "Dataset",
} as const;

export type IeTag = keyof typeof IE_TAGS;
export type TopicTag = keyof typeof TOPIC_TAGS;
export type MlTag = keyof typeof ML_TAGS;
export type TypeTag = keyof typeof TYPE_TAGS;

/** All four vocabularies by dimension. Key order is the curated display order. */
export const TAGS = { ie: IE_TAGS, topic: TOPIC_TAGS, ml: ML_TAGS, type: TYPE_TAGS } as const;
export type TagDim = keyof typeof TAGS;
export const TAG_DIMS = Object.keys(TAGS) as TagDim[];

/** Short names for Fig. 1 on the home page, whose labels must fit beside the
 * nodes at phone width. Each one is the start of the tag's full label, so it
 * reads as the filter chip of the same name. Typed so that a new IE or ML tag
 * fails the type check until it has one. */
export const SHORT_LABELS: Record<IeTag | MlTag, string> = {
  lca: "Life cycle",
  sem: "Socio-economic",
  eeio: "Input-output",
  circular: "Circular economy",
  symbiosis: "Industrial symbiosis",
  llm: "LLMs",
  "nlp-extraction": "NLP",
  cv: "Computer vision",
  segmentation: "Detection",
  depth: "Depth & 3D",
  "remote-sensing": "Remote sensing",
  "tabular-ml": "Tabular ML",
  generative: "Generative models",
  foundation: "Foundation models",
  "anomaly-detection": "Anomaly",
  uncertainty: "Uncertainty",
};

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
