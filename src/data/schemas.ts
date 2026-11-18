// One zod schema per data file. The site build (content.config.ts), the data
// tests and the islands (via z.infer) all use these, so the validation rules
// and entry types live in one place.
import { z } from "astro/zod";
import { IE_TAGS, type IeTag, ML_TAGS, type MlTag, TYPE_TAGS, type TypeTag } from "./tags";

const ieTag = z.enum(Object.keys(IE_TAGS) as [IeTag, ...IeTag[]]);
const mlTag = z.enum(Object.keys(ML_TAGS) as [MlTag, ...MlTag[]]);
const typeTag = z.enum(Object.keys(TYPE_TAGS) as [TypeTag, ...TypeTag[]]);

// Computed when the site builds, so a paper dated next year (online-first) passes.
const MAX_YEAR = new Date().getFullYear() + 1;

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
    ml: z.array(mlTag).default([]),
    type: z.array(typeTag).min(1),
    added: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM; drives the "new" marker
  })
  .refine((e) => e.doi || e.arxiv, { message: "set doi, arxiv or both" });

export const applicationSchema = z.object({
  name: z.string(),
  ie: z.array(ieTag).min(1),
  ml: z.array(mlTag).min(1),
  summary: z.string().max(400),
  maturity: z.string().max(200), // plain prose, no rubric codes
  papers: z.array(z.string()).default([]), // ids into literature.yaml
  demo: z.string().optional(), // site-relative path (resolved against base) or full URL
});

// Entry ids come from the YAML `id:` key via Astro's file() loader.
export type LitEntry = z.infer<typeof literatureSchema> & { id: string };
export type AppEntry = z.infer<typeof applicationSchema> & { id: string };
