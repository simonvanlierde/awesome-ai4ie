import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DIM_OF_SCHEME, TAG_DIMS, type TagDim } from "./tags";
import {
  GENERATED_FILE,
  readVocabulary,
  renderGenerated,
  SCHEMES,
  VOCABULARY_FILE,
} from "./vocabulary";

const concepts = readVocabulary();
const byId = new Map(concepts.map((c) => [c.id, c]));
const dimOf = (id: string) => {
  const c = byId.get(id);
  return c && DIM_OF_SCHEME[c.scheme];
};

type Tagged = Partial<Record<TagDim, string[]>> & { id?: string; doi?: string };
const yaml = (file: string) => parse(readFileSync(file, "utf8")) as Tagged[];

/** Every tag the site's data and pages use, as "where: dim=tag". */
function usedTags(): { where: string; dim: TagDim; tag: string }[] {
  const out: { where: string; dim: TagDim; tag: string }[] = [];
  const add = (where: string, e: Tagged) => {
    for (const dim of TAG_DIMS) for (const tag of e[dim] ?? []) out.push({ where, dim, tag });
  };
  for (const f of ["literature", "applications", "resources"])
    for (const e of yaml(`src/data/${f}.yaml`)) add(`${f}.yaml ${e.id}`, e);
  for (const e of yaml("src/data/candidates.yaml") as (Tagged & { hints?: Tagged })[])
    add(`candidates.yaml ${e.doi}`, e.hints ?? {});
  // Component props (`ie="lca"`) and literature links (`?ie=lca,sem`) in the pages.
  const docs = "src/content/docs";
  const PROP = /\b(ie|topic|ml|type)="([a-z0-9-]+)"/g;
  // `/contribute/?type=` picks a form type, not a tag.
  const QUERY = /(?<!contribute\/)[?&](ie|topic|ml|type)=([a-z0-9,-]+)/g;
  for (const f of readdirSync(docs, { recursive: true, encoding: "utf8" })) {
    if (!/\.mdx?$/.test(f)) continue;
    const text = readFileSync(join(docs, f), "utf8");
    for (const [, dim, tag] of text.matchAll(PROP))
      if (tag !== "any" && tag !== "none") out.push({ where: f, dim: dim as TagDim, tag });
    for (const [, dim, tags] of text.matchAll(QUERY))
      for (const tag of tags.split(",")) out.push({ where: f, dim: dim as TagDim, tag });
  }
  return out;
}

describe("vocabulary.yaml", () => {
  it("matches vocabulary.gen.ts; run `pnpm run vocabulary` after editing it", () => {
    expect(readFileSync(GENERATED_FILE, "utf8")).toBe(renderGenerated(readVocabulary()));
  });

  it("has ids unique across schemes, none named like a scheme", () => {
    expect(new Set(concepts.map((c) => c.id)).size).toBe(concepts.length);
    for (const s of Object.keys(SCHEMES)) expect(byId.has(s), s).toBe(false);
    const terms = JSON.parse(readFileSync("vocabulary/context.jsonld", "utf8"))["@context"];
    for (const c of concepts) {
      expect(c.id in terms, `${c.id} is a context term`).toBe(false);
      expect(c.id.startsWith("retired-"), `${c.id} clashes with a retired anchor`).toBe(false);
    }
  });

  it("replaces a concept only when it is retired, and with a live one", () => {
    for (const c of concepts) {
      if (c.replacedBy) expect(c.deprecated, `${c.id} has replacedBy`).toBe(true);
      if (!c.replacedBy) continue;
      const to = byId.get(c.replacedBy);
      expect(to, `${c.id} → ${c.replacedBy}`).toBeDefined();
      expect(to?.deprecated, `${c.id} → ${c.replacedBy} is retired`).toBeUndefined();
    }
  });

  it("points broader and related at live concepts", () => {
    for (const c of concepts)
      for (const id of [...(c.broader ?? []), ...(c.related ?? [])]) {
        expect(byId.get(id), `${c.id} → ${id}`).toBeDefined();
        expect(byId.get(id)?.deprecated, `${c.id} → ${id} is retired`).toBeUndefined();
      }
  });

  it("gives each live IE field and AI technique a short label", () => {
    for (const c of concepts)
      if (!c.deprecated && (c.scheme === "field" || c.scheme === "technique"))
        expect(c.short, c.id).toBeTruthy();
  });

  it("has no flag a retired concept cannot carry", () => {
    for (const c of concepts.filter((x) => x.deprecated)) expect(c.reserved, c.id).toBeUndefined();
  });
});

describe("tags in use", () => {
  const used = usedTags();

  it("finds the tags", () => {
    expect(used.length).toBeGreaterThan(100);
  });

  it("are live concepts in the vocabulary, in the dimension of their scheme", () => {
    for (const { where, dim, tag } of used) {
      expect(byId.has(tag), `${where}: ${dim}=${tag} is not in ${VOCABULARY_FILE}`).toBe(true);
      expect(byId.get(tag)?.deprecated, `${where}: ${tag} is retired`).toBeUndefined();
      expect(dimOf(tag), `${where}: ${tag} is not a ${dim} tag`).toBe(dim);
    }
  });

  it("cover every live concept, or it is marked reserved", () => {
    const inUse = new Set(used.map((u) => u.tag));
    for (const c of concepts.filter((x) => !x.deprecated))
      expect(inUse.has(c.id) || c.reserved === true, `${c.id} is unused`).toBe(true);
    for (const c of concepts.filter((x) => x.reserved))
      expect(inUse.has(c.id), `${c.id} is used, so drop reserved`).toBe(false);
  });
});
