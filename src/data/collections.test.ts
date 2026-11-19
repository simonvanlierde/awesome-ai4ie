import { readFileSync } from "node:fs";
import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { applicationSchema, literatureSchema } from "./schemas";
import { TAG_DIMS, TOPIC_TAGS } from "./tags";

// Field-level rules live in the schemas (same ones the site build enforces);
// these tests only add what zod can't express: uniqueness and cross-references.
type Raw = { id?: string; doi?: string; arxiv?: string; papers?: string[] };
const lit = parse(readFileSync("src/data/literature.yaml", "utf8")) as Raw[];
const apps = parse(readFileSync("src/data/applications.yaml", "utf8")) as Raw[];

describe("literature.yaml", () => {
  it("matches the site schema", () => {
    z.array(literatureSchema).parse(lit);
  });
  it("has unique ids, DOIs and arXiv ids", () => {
    for (const e of lit) expect(e.id, "entry missing id").toBeTruthy();
    expect(new Set(lit.map((e) => e.id)).size).toBe(lit.length);
    for (const k of ["doi", "arxiv"] as const) {
      // DOIs are case-insensitive, so compare them lower-cased.
      const ids = lit.flatMap((e) => (e[k] ? [e[k].toLowerCase()] : []));
      expect(new Set(ids).size, `duplicate ${k}`).toBe(ids.length);
    }
  });
  it("lists each tag at most once per entry", () => {
    for (const e of [...lit, ...apps] as Record<string, unknown>[])
      for (const dim of TAG_DIMS) {
        const tags = (e[dim] as string[] | undefined) ?? [];
        expect(new Set(tags).size, `${e.id}: duplicate ${dim} tag`).toBe(tags.length);
      }
  });
  it("gives every topic at least one entry, since a tag arrives with its first", () => {
    const used = new Set(lit.flatMap((e) => (e as { topic?: string[] }).topic ?? []));
    for (const t of Object.keys(TOPIC_TAGS)) expect(used.has(t), t).toBe(true);
  });
  it("requires a doi or an arxiv id", () => {
    const { doi: _d, arxiv: _a, ...bare } = lit[0] as Record<string, unknown>;
    expect(literatureSchema.safeParse(bare).success).toBe(false);
    expect(literatureSchema.safeParse({ ...bare, arxiv: "2401.01234" }).success).toBe(true);
  });
  it("keeps status: proposal and rejects any other status", () => {
    expect(literatureSchema.parse({ ...lit[0], status: "proposal" }).status).toBe("proposal");
    expect(literatureSchema.safeParse({ ...lit[0], status: "vetted" }).success).toBe(false);
  });
});

describe("applications.yaml", () => {
  it("matches the site schema", () => {
    z.array(applicationSchema).parse(apps);
  });
  it("has ids and references only existing literature ids", () => {
    const ids = new Set(lit.map((e) => e.id));
    for (const a of apps) {
      expect(a.id, "entry missing id").toBeTruthy();
      for (const p of a.papers ?? []) expect(ids.has(p), `${a.id} → ${p}`).toBe(true);
    }
  });
});
