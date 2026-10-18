import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CHAPTERS } from "../lib/chapters";
import { TAGS } from "./tags";

// The issue forms copy the tag labels and page names by hand, because GitHub
// reads them as static YAML. This keeps them in step with the site.
const root = join(import.meta.dirname, "..", "..");
const formsDir = join(root, ".github", "ISSUE_TEMPLATE");

type Field = { type: string; id?: string; attributes: { options?: unknown[] } };
const fields = (form: string): Field[] =>
  parse(readFileSync(join(formsDir, `${form}.yml`), "utf8")).body;
const options = (form: string, id: string) =>
  fields(form).find((f) => f.id === id)?.attributes.options;

describe("issue forms", () => {
  it.each(["paper", "application"])("%s lists every IE field and AI technique", (form) => {
    expect(options(form, "ie")).toEqual(Object.values(TAGS.ie));
    expect(options(form, "ml")).toEqual(Object.values(TAGS.ml));
  });

  it("paper lists every kind of entry", () => {
    expect(options("paper", "type")).toEqual(Object.values(TAGS.type));
  });

  // SuggestPaper and any `?gap=` link prefill this text field.
  it.each(["paper", "application"])("%s has the gap field that links prefill", (form) => {
    expect(fields(form).find((f) => f.id === "gap")?.type).toBe("input");
  });

  it("other lists every chapter", () => {
    expect(options("other", "page")?.slice(0, -1)).toEqual(CHAPTERS.map((c) => c.title));
  });

  it("tool lists the pages of the tools chapter", () => {
    const titles = ["index.md", "local-ai.md", "data-and-models.md"].map(
      (f) =>
        readFileSync(join(root, "src", "content", "docs", "tools", f), "utf8").match(
          /^title: (.+)$/m,
        )?.[1],
    );
    expect(options("tool", "page")).toEqual(titles);
  });
});

describe("repo:issues/new links", () => {
  const docs = join(root, "src", "content", "docs");
  const FORM_LINK = /repo:issues\/new\?template=([\w-]+\.yml)/g;
  const links = readdirSync(docs, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.mdx?$/.test(f))
    .flatMap((f) =>
      [...readFileSync(join(docs, f), "utf8").matchAll(FORM_LINK)].map((m) => ({
        file: f,
        form: m[1],
      })),
    );

  it("finds the links", () => {
    expect(links.length).toBeGreaterThan(0);
  });
  it.each(links)("$file opens an existing form, $form", ({ form }) => {
    expect(existsSync(join(formsDir, form))).toBe(true);
  });
});
