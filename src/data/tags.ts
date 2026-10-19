// Shared tag vocabulary for the literature list, the applications map and the
// data schemas. Add a tag here first: the collections test rejects data that
// uses a tag not defined here. A new IE field also needs a `.field-<tag>` ink
// rule in src/styles/custom.css (only five inks exist, see DESIGN.md) and a
// section on the map page; chapters.test.ts checks both. The issue forms in
// .github/ISSUE_TEMPLATE/ list the labels too; forms.test.ts checks them.
// Add a tag together with its first vetted entry, not before. The map page
// names the known gaps under "Not mapped yet".
export const IE_TAGS = {
  lca: "LCA & footprinting",
  mfa: "MFA & stocks and flows",
  eol: "Waste, EoL & circularity",
  "urban-mining": "Urban mining & secondary resources",
} as const;

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
} as const;

export const TYPE_TAGS = {
  "landmark-ml": "ML landmark",
  meta: "Research practice",
  review: "Review",
  method: "Method",
  dataset: "Dataset",
} as const;

export type IeTag = keyof typeof IE_TAGS;
export type MlTag = keyof typeof ML_TAGS;
export type TypeTag = keyof typeof TYPE_TAGS;

/** All three vocabularies by dimension. Key order is the curated display order. */
export const TAGS = { ie: IE_TAGS, ml: ML_TAGS, type: TYPE_TAGS } as const;
export type TagDim = keyof typeof TAGS;
export const TAG_DIMS = Object.keys(TAGS) as TagDim[];

/** Short names for Fig. 1 on the home page, whose labels must fit beside the
 * nodes at phone width. Each one is the start of the tag's full label, so it
 * reads as the filter chip of the same name. Typed so that a new IE or ML tag
 * fails the type check until it has one. */
export const SHORT_LABELS: Record<IeTag | MlTag, string> = {
  lca: "LCA",
  mfa: "MFA",
  eol: "Waste, EoL",
  "urban-mining": "Urban mining",
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
};

/** Short label for an IE or ML tag; falls back to the slug. */
export function shortLabel(tag: string): string {
  return (SHORT_LABELS as Record<string, string>)[tag] ?? tag;
}

/** What each dimension is called in the UI. */
export const DIM_LABELS: Record<TagDim, string> = {
  ie: "IE field",
  ml: "AI technique",
  type: "Type",
};

/** Display label for a tag; falls back to the slug for a tag not in the vocabulary. */
export function tagLabel(dim: TagDim, tag: string): string {
  return (TAGS[dim] as Record<string, string>)[tag] ?? tag;
}
