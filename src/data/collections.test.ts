import { existsSync, readdirSync, readFileSync } from "node:fs";
import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { knownDois } from "../../scripts/openalex-candidates.mjs";
import { applicationSchema, literatureSchema, resourceSchema } from "./schemas";
import { TAG_DIMS, TOPIC_TAGS } from "./tags";

// Field-level rules live in the schemas (same ones the site build enforces);
// these tests only add what zod can't express: uniqueness and cross-references.
type Raw = { id?: string; doi?: string; arxiv?: string; papers?: string[] };
const lit = parse(readFileSync("src/data/literature.yaml", "utf8")) as Raw[];
const apps = parse(readFileSync("src/data/applications.yaml", "utf8")) as Raw[];
const resources = parse(readFileSync("src/data/resources.yaml", "utf8")) as Record<
  string,
  string
>[];

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
  it("validates linked evaluation evidence and distinguishes author-reported from reproduced", () => {
    const withEvidence = lit.find((e) => e.id === "zhaoConstructionWastetoresourceKnowledge2025");
    const parsed = literatureSchema.parse(withEvidence);
    expect(parsed.evidence?.results[0]?.source).toBe("author-reported");
    const badSource = structuredClone(withEvidence) as Record<string, unknown>;
    (
      (badSource.evidence as { results: { source: string }[] }).results[0] as { source: string }
    ).source = "estimated";
    expect(literatureSchema.safeParse(badSource).success).toBe(false);
    const missingUncertainty = structuredClone(withEvidence) as Record<string, unknown>;
    (
      (missingUncertainty.evidence as { results: { uncertainty: string }[] }).results[0] as {
        uncertainty: string;
      }
    ).uncertainty = "";
    expect(literatureSchema.safeParse(missingUncertainty).success).toBe(false);
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

const WHY = /^rule [1-4]: /;
const SENTENCE_END = /\.\)?$/;
const SITE_LINK = /\]\((\/[^)#]*)/g;
const TRAILING_SLASH = /\/$/;

describe("resources.yaml", () => {
  it("matches the site schema", () => {
    z.array(resourceSchema).parse(resources);
  });
  it("has unique ids and URLs", () => {
    for (const e of resources) expect(e.id, "entry missing id").toBeTruthy();
    expect(new Set(resources.map((e) => e.id)).size).toBe(resources.length);
    expect(new Set(resources.map((e) => e.url)).size).toBe(resources.length);
  });
  // Resources.astro writes "Good for:" and the cost after these, so each must end a sentence.
  it("ends every text field with a full stop", () => {
    for (const e of resources)
      for (const k of ["blurb", "good", "notFor"])
        if (e[k]) expect(e[k], `${e.id}.${k}`).toMatch(SENTENCE_END);
  });
  // Component output skips the build's link check, so check internal links here.
  it("links only to pages that exist", () => {
    for (const e of resources)
      for (const k of ["blurb", "good", "notFor"])
        for (const [, path] of (e[k] ?? "").matchAll(SITE_LINK)) {
          const page = `src/content/docs${path.replace(TRAILING_SLASH, "") || "/index"}`;
          const found = [".md", ".mdx", "/index.md", "/index.mdx"].some((x) =>
            existsSync(page + x),
          );
          expect(found, `${e.id}: ${path}`).toBe(true);
        }
  });
});

describe("skills/", () => {
  it("has a section on the prompts-and-skills page for each skill", () => {
    const page = readFileSync("src/content/docs/best-practices/prompts-and-skills.mdx", "utf8");
    const skills = readdirSync("skills", { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(skills.length).toBeGreaterThan(0);
    for (const d of skills) expect(page, d.name).toContain(`### ${d.name}`);
  });
});

describe("candidates.yaml", () => {
  const cands = parse(readFileSync("src/data/candidates.yaml", "utf8")) as (Raw & {
    status?: string;
    why?: string;
  })[];
  const listed = knownDois(lit);

  it("holds each DOI once, with a known status and a numbered why for rejects", () => {
    const dois = cands.map((c) => c.doi);
    expect(new Set(dois).size).toBe(dois.length);
    for (const c of cands) {
      expect(["new", "rejected", "listed"], c.doi).toContain(c.status);
      // The rule numbers are the scope rules in CONTRIBUTING.md, "Adding a paper".
      if (c.status === "rejected") expect(c.why, `${c.doi} needs a why`).toMatch(WHY);
    }
  });

  it("marks a lead listed only once it is in literature.yaml", () => {
    for (const c of cands.filter((x) => x.status === "listed")) {
      expect(listed.has(c.doi), c.doi).toBe(true);
    }
  });
});
