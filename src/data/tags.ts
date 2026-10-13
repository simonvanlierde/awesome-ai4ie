// Shared tag vocabulary: used by the literature list, the applications map,
// and the schema validation in content.config.ts. Add new tags here first;
// the collections test enforces that data files only use tags defined here.
// Areas with no vetted entries yet are deliberately absent: add the tag together
// with its first entry. The known gaps are named under "Not mapped yet" on the
// applications map, so the absences stay visible instead of implicit.
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
