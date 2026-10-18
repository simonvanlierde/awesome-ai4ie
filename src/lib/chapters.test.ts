import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IE_TAGS } from "../data/tags";
import { CHAPTERS, chapterOf } from "./chapters";

// The chapter order lives in astro.config.mjs (sidebar), chapters.ts (running
// heads, home index, Fig. 2) and custom.css (tab inks by position). Nothing at
// build time ties them together, so these tests do.
const config = readFileSync("astro.config.mjs", "utf8");
const css = readFileSync("src/styles/custom.css", "utf8");
const SIDEBAR_END = /^ {6}\],/;
const TOP_LEVEL_ENTRY = /^ {8}\{/;
const HAS_TARGET = /(slug|link): "/;
const TARGET = /(?:slug|link): "([^"]*)"/;
const FIG2_ANCHOR = /^## What works today, per field$/m;

/** First slug (or link) of each top-level sidebar entry, as its first path segment. */
function sidebarTopLevel(): string[] {
  const block = config.slice(config.indexOf("sidebar: ["));
  const lines = block.split("\n");
  const end = lines.findIndex((l) => SIDEBAR_END.test(l));
  const out: string[] = [];
  lines.slice(1, end).forEach((line, i, rest) => {
    if (!TOP_LEVEL_ENTRY.test(line)) return;
    const first = rest.slice(i).find((l) => HAS_TARGET.test(l)) ?? "";
    const value = TARGET.exec(first)?.[1] ?? "";
    out.push(value === "/" ? "/" : value.split("/")[0]);
  });
  return out;
}

describe("chapters", () => {
  it("follow the sidebar order, after Home", () => {
    expect(sidebarTopLevel()).toEqual(["/", ...CHAPTERS.map((c) => c.slug)]);
  });

  it("each have a sidebar tab ink and an ink in both themes", () => {
    CHAPTERS.forEach((_, i) => {
      const n = i + 1;
      expect(css).toContain(`li:nth-child(${n + 1}) {\n  --chapter-ink: var(--ink-${n});`);
      expect(css.match(new RegExp(`--ink-${n}: #`, "g"))?.length).toBe(2);
    });
  });

  it("resolve a page id to its chapter, and the home page to none", () => {
    expect(chapterOf("tools/local-ai")?.n).toBe(4);
    expect(chapterOf("literature")?.title).toBe("Literature & resources");
    expect(chapterOf("index")).toBeUndefined();
  });

  it("give every IE field an ink", () => {
    for (const tag of Object.keys(IE_TAGS)) expect(css).toContain(`.field-${tag} {`);
  });

  it("keep the anchor Fig. 2 links to", () => {
    // Component links escape the build's link validator, which checks Markdown only.
    const map = readFileSync("src/content/docs/applications-map/index.mdx", "utf8");
    expect(map).toMatch(FIG2_ANCHOR);
  });
});
