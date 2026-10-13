import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// `repo:` links become GitHub URLs at build time, so neither the build's link validator
// nor the weekly lychee run sees them; a typo would ship as a 404 on GitHub.
const REPO_LINK = /repo:(?:blob|tree)\/main\/([^)\s"'#]+)/g;
const docs = join(import.meta.dirname, "docs");
const MARKDOWN = /\.mdx?$/;

describe("repo: links", () => {
  const files = readdirSync(docs, { recursive: true, encoding: "utf8" }).filter((f) =>
    MARKDOWN.test(f),
  );
  const targets = files.flatMap((f) =>
    [...readFileSync(join(docs, f), "utf8").matchAll(REPO_LINK)].map((m) => ({
      file: f,
      path: m[1],
    })),
  );

  it("finds the links", () => {
    expect(targets.length).toBeGreaterThan(0);
  });
  it.each(targets)("$file links an existing $path", ({ path }) => {
    expect(existsSync(join(import.meta.dirname, "..", "..", path))).toBe(true);
  });
});
