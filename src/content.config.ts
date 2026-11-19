import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { file } from "astro/loaders";
import { parse } from "yaml";
import { applicationSchema, literatureSchema, resourceSchema } from "./data/schemas";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  literature: defineCollection({
    loader: file("src/data/literature.yaml", { parser: parse }),
    schema: literatureSchema,
  }),
  applications: defineCollection({
    loader: file("src/data/applications.yaml", { parser: parse }),
    schema: applicationSchema,
  }),
  resources: defineCollection({
    loader: file("src/data/resources.yaml", { parser: parse }),
    schema: resourceSchema,
  }),
};
