import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// scripts/subset-fonts.py cuts the fonts to charset.txt. A character outside it falls
// back to a system font, which looks different and widens the line. Either add the
// character to UNICODES in that script and rerun it, or, when the fallback is
// acceptable (symbols the fonts never had), add it to FALLBACK here.
const src = join(import.meta.dirname, "..");
const covered = new Set(
  readFileSync(join(import.meta.dirname, "fonts/charset.txt"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((hex) => String.fromCodePoint(Number.parseInt(hex.slice(2), 16))),
);
const FALLBACK = new Set([..."ăłŽθϕ‐₂→↓↔≈⌘─■□"]);
const TEXT = /\.(mdx?|astro|tsx|ts)$/;

const files = ["content/docs", "components", "data"].flatMap((d) =>
  readdirSync(join(src, d), { recursive: true, encoding: "utf8" })
    .filter((f) => TEXT.test(f) && !f.includes(".test."))
    .map((f) => join(src, d, f)),
);

describe("font subset", () => {
  it("scans files", () => {
    expect(files.length).toBeGreaterThan(20);
  });
  it.each(files)("%s uses only covered or known-fallback characters", (file) => {
    const stray = [...new Set(readFileSync(file, "utf8"))].filter(
      (c) => c > "\u007f" && !covered.has(c) && !FALLBACK.has(c),
    );
    expect(stray).toEqual([]);
  });
});
