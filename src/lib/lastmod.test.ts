import { describe, expect, it } from "vitest";
import { latest, sourcesFor } from "./lastmod";

describe("latest", () => {
  it("picks the latest date, across time zones", () => {
    expect(latest(["2026-03-01T10:00:00+01:00", "2026-03-01T09:30:00Z", undefined])).toBe(
      "2026-03-01T09:30:00Z",
    );
  });

  it("returns undefined when no date is known", () => {
    expect(latest([undefined, undefined])).toBeUndefined();
    expect(latest([])).toBeUndefined();
  });
});

describe("sourcesFor", () => {
  it("adds the data files a data-rendered page draws on", () => {
    expect(sourcesFor("applications-map/mfa")).toEqual([
      "src/content/docs/applications-map/mfa.mdx",
      "src/data/applications.yaml",
      "src/data/literature.yaml",
    ]);
    expect(sourcesFor("")).toEqual(["src/content/docs/index.mdx", "src/data/literature.yaml"]);
  });

  it("finds a section's index page and leaves plain pages without data", () => {
    expect(sourcesFor("tools")).toEqual(["src/content/docs/tools/index.md"]);
  });
});
