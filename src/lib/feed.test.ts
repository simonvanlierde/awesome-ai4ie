import { describe, expect, it } from "vitest";
import { buildFeed, esc, FEED_LIMIT, pubDate } from "./feed";

const entry = (id: string, added: string, extra = {}) => ({
  title: `Title ${id}`,
  authors: ["Donati, F."],
  etAl: true,
  year: 2022,
  doi: `10.1000/${id}`,
  blurb: "Why read this one.",
  added,
  ...extra,
});

describe("esc", () => {
  it("escapes the five XML characters", () => {
    expect(esc(`a & b < c > "d" 'e'`)).toBe("a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
  });
});

describe("pubDate", () => {
  it("is the first of the month at midnight UTC", () => {
    expect(pubDate("2026-07")).toBe("Wed, 01 Jul 2026 00:00:00 GMT");
  });
});

describe("buildFeed", () => {
  it("lists the newest month first and links the DOI, falling back to arXiv", () => {
    const xml = buildFeed(
      [entry("a", "2026-05"), entry("b", "2026-07", { doi: undefined, arxiv: "2401.00001" })],
      "https://ai4ie.org",
    );
    expect(xml.indexOf("Title b")).toBeLessThan(xml.indexOf("Title a"));
    expect(xml).toContain("<link>https://arxiv.org/abs/2401.00001</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://doi.org/10.1000/a</guid>');
    expect(xml).toContain("Donati, F., et al. (2022).");
  });
  it("escapes titles", () => {
    const xml = buildFeed([entry("a", "2026-07", { title: "A & B <i>" })], "https://ai4ie.org");
    expect(xml).toContain("<title>A &amp; B &lt;i&gt;</title>");
  });
  it("caps the item count after sorting, so the newest entries stay", () => {
    const old = Array.from({ length: FEED_LIMIT }, (_, i) => entry(`old${i}`, "2026-05"));
    const xml = buildFeed([...old, entry("newest", "2026-07")], "https://ai4ie.org");
    expect(xml.match(/<item>/g)).toHaveLength(FEED_LIMIT);
    expect(xml).toContain("Title newest");
    expect(xml).not.toContain(`Title old${FEED_LIMIT - 1}<`);
  });
  it("keeps file order within a month and dates the feed by its newest entry", () => {
    const xml = buildFeed(
      [entry("x", "2026-07"), entry("y", "2026-07"), entry("z", "2026-05")],
      "https://ai4ie.org",
    );
    expect(xml.indexOf("Title x")).toBeLessThan(xml.indexOf("Title y"));
    expect(xml).toContain("<lastBuildDate>Wed, 01 Jul 2026 00:00:00 GMT</lastBuildDate>");
  });
});
