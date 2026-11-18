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
  const now = new Date("2026-08-01T00:00:00Z");
  it("lists the newest month first and links the DOI, falling back to arXiv", () => {
    const xml = buildFeed(
      [entry("a", "2026-05"), entry("b", "2026-07", { doi: undefined, arxiv: "2401.00001" })],
      "https://ai4ie.org",
      now,
    );
    expect(xml.indexOf("Title b")).toBeLessThan(xml.indexOf("Title a"));
    expect(xml).toContain("<link>https://arxiv.org/abs/2401.00001</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://doi.org/10.1000/a</guid>');
    expect(xml).toContain("Donati, F., et al. (2022).");
  });
  it("escapes titles and caps the item count", () => {
    const many = Array.from({ length: FEED_LIMIT + 5 }, (_, i) =>
      entry(`e${i}`, "2026-07", { title: "A & B <i>" }),
    );
    const xml = buildFeed(many, "https://ai4ie.org", now);
    expect(xml.match(/<item>/g)).toHaveLength(FEED_LIMIT);
    expect(xml).toContain("<title>A &amp; B &lt;i&gt;</title>");
  });
});
