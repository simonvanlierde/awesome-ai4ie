// One zod schema per data file. The site build (content.config.ts), the data
// tests and the islands (via z.infer) all use these, so the validation rules
// and entry types live in one place.
import { z } from "astro/zod";
import {
  IE_TAGS,
  type IeTag,
  ML_TAGS,
  type MlTag,
  TOPIC_TAGS,
  type TopicTag,
  TYPE_TAGS,
  type TypeTag,
} from "./tags";

const ieTag = z.enum(Object.keys(IE_TAGS) as [IeTag, ...IeTag[]]);
const topicTag = z.enum(Object.keys(TOPIC_TAGS) as [TopicTag, ...TopicTag[]]);
const mlTag = z.enum(Object.keys(ML_TAGS) as [MlTag, ...MlTag[]]);
const typeTag = z.enum(Object.keys(TYPE_TAGS) as [TypeTag, ...TypeTag[]]);

// Computed when the site builds, so a paper dated next year (online-first) passes.
const MAX_YEAR = new Date().getFullYear() + 1;

const evidenceLinkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

// OpenML-inspired evaluation evidence linked directly to a literature entry.
// Paper metadata (id, doi, arxiv) lives on the parent entry and is not duplicated here.
export const evidenceSchema = z.object({
  dataset: z.object({
    identifier: z.string().min(1),
    url: z.url().optional(),
    provenance: z.string().min(1),
    modality: z.string().min(1),
    access: z.string().min(1),
    licence: z.string().min(1),
  }),
  task: z.object({
    target: z.string().min(1),
    scope: z.string().min(1),
    split: z.string().min(1),
    metric: z.string().min(1),
    reference: z.string().min(1),
  }),
  method: z.object({
    repositories: z.array(evidenceLinkSchema).default([]),
    revision: z.string().min(1),
    model: z.string().min(1),
  }),
  results: z
    .array(
      z.object({
        source: z.enum(["author-reported", "reproduced"]),
        metric: z.string().min(1),
        value: z.string().min(1),
        uncertainty: z.string().min(1),
        locator: z.string().min(1),
        setting: z.string().min(1),
        limits: z.string().min(1),
      }),
    )
    .min(1),
});

export const literatureSchema = z
  .object({
    title: z.string(),
    // One "Surname, I." per author. A long list may stop early with etAl: true;
    // the full list lives at the DOI.
    authors: z.array(z.string().regex(/^[^,]+, \S/)).min(1),
    etAl: z.boolean().default(false),
    year: z.number().int().min(1950).max(MAX_YEAR),
    doi: z
      .string()
      .regex(/^10\.\d{4,9}\/\S+$/)
      .optional(), // bare id, no https://doi.org/
    arxiv: z
      .string()
      .regex(/^\d{4}\.\d{4,5}$/)
      .optional(), // bare id, no URL or version
    blurb: z.string().min(10).max(300), // one line: why read this
    ie: z.array(ieTag).default([]), // empty = not IE-specific (e.g. ML landmarks)
    topic: z.array(topicTag).default([]), // may stand alone: a topic with no IE field yet
    ml: z.array(mlTag).default([]),
    type: z.array(typeTag).min(1),
    added: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM; drives the "new" marker
    // Proposed by a curator, not yet vetted by the group; shown with a "proposal" badge.
    status: z.literal("proposal").optional(),
    evidence: evidenceSchema.optional(),
  })
  .refine((e) => e.doi || e.arxiv, { message: "set doi, arxiv or both" });

// Maturity stages in ascending order; the first entry is the least mature.
export const STAGES = {
  early: "Early studies",
  tested: "Tested in research studies",
  applied: "Applied to real data",
} as const;
export type Stage = keyof typeof STAGES;

export const applicationSchema = z.object({
  name: z.string(),
  ie: z.array(ieTag).min(1),
  ml: z.array(mlTag).min(1),
  summary: z.string().max(400),
  stage: z.enum(Object.keys(STAGES) as [Stage, ...Stage[]]), // the verdict shown beside the name
  maturity: z.string().max(200), // plain prose, no rubric codes: the evidence behind the stage
  papers: z.array(z.string()).default([]), // ids into literature.yaml
  demo: z.string().optional(), // site-relative path (resolved against base) or full URL
});

// The kinds and tool groups in display order; Resources.astro labels and filters by them.
export const RESOURCE_KINDS = {
  tool: "Tool",
  dataset: "Dataset",
  model: "Models",
  course: "Course",
  video: "Video",
  post: "Post",
  community: "Community",
} as const;
export type ResourceKind = keyof typeof RESOURCE_KINDS;
// Which list on the Software tools and Local AI pages a tool sits in.
export const TOOL_GROUPS = ["assistant", "coding", "research", "library", "local"] as const;
// The three answers of the tool form's "Does data leave your machine?".
export const DATA_LABELS: Record<"leaves" | "can-stay-local" | "local", string> = {
  leaves: "Data leaves your machine.",
  "can-stay-local": "Can stay fully local.",
  local: "Data stays on your machine.",
};

// Text fields may hold Markdown links, `[text](/site/path/)` or `[text](https://...)`.
export const resourceSchema = z.object({
  title: z.string(),
  url: z.url(),
  kind: z.enum(Object.keys(RESOURCE_KINDS) as [ResourceKind, ...ResourceKind[]]),
  blurb: z.string().min(10).max(300), // one line: why it's worth your time
  good: z.string().max(200).optional(), // "Good for:"
  notFor: z.string().max(200).optional(), // "Not for:"
  ie: z.array(ieTag).default([]), // empty = not IE-specific
  topic: z.array(topicTag).default([]),
  ml: z.array(mlTag).default([]),
  checked: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM, when the link and the text were last checked
  cost: z.string().max(60).optional(), // tools: "Free", "Free tier + paid", ...
  data: z.enum(["leaves", "can-stay-local", "local"]).optional(), // tools; see DATA_LABELS
  group: z.enum(TOOL_GROUPS).optional(), // tools
  status: z.literal("proposal").optional(), // as in literature.yaml
});

// Entry ids come from the YAML `id:` key via Astro's file() loader.
export type LitEntry = z.infer<typeof literatureSchema> & { id: string };
export type AppEntry = z.infer<typeof applicationSchema> & { id: string };
export type ResourceEntry = z.infer<typeof resourceSchema> & { id: string };
