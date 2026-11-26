import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IE_TAGS } from "../data/tags";
import { CHAPTERS } from "./chapters";

// The sidebar, home index, and tab inks use the same chapter order.
const config = readFileSync("astro.config.mjs", "utf8");
const css = readFileSync("src/styles/custom.css", "utf8");
const SIDEBAR_END = /^ {6}\],/;
const TOP_LEVEL_ENTRY = /^ {8}\{/;
const HAS_TARGET = /(slug|link): "/;
const TARGET = /(?:slug|link): "([^"]*)"/;

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

  it("give every IE field an ink", () => {
    for (const tag of Object.keys(IE_TAGS)) expect(css).toContain(`.field-${tag} {`);
  });

  it("link every IE field's page from the map page", () => {
    const map = readFileSync("src/content/docs/applications-map/index.mdx", "utf8");
    for (const tag of Object.keys(IE_TAGS))
      expect(map, `no link to /applications-map/${tag}/ on the map`).toContain(
        `](/applications-map/${tag}/)`,
      );
  });

  it("give every IE field its own page", () => {
    for (const tag of Object.keys(IE_TAGS)) {
      const page = readFileSync(`src/content/docs/applications-map/${tag}.mdx`, "utf8");
      expect(page, `no <FieldPage ie="${tag}" /> on its page`).toContain(
        `<FieldPage ie="${tag}" />`,
      );
    }
  });

  it("keep the generated topic gaps on the map page", () => {
    const map = readFileSync("src/content/docs/applications-map/index.mdx", "utf8");
    expect(map).toContain("<TopicGaps />");
  });
});
