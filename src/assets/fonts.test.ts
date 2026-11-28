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
const TEXT = /\.(mdx?|astro|tsx|ts|ya?ml|json)$/;
// Unreviewed OpenAlex leads; nothing in it renders until a paper moves to literature.yaml.
const SKIP = new Set(["candidates.yaml"]);
const WDTH = /["']wdth["']/;

const files = ["content/docs", "components", "data", "lib", "pages"].flatMap((d) =>
  readdirSync(join(src, d), { recursive: true, encoding: "utf8" })
    .filter((f) => TEXT.test(f) && !f.includes(".test.") && !SKIP.has(f))
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

// subset-fonts.py cuts Archivo's width axis to 72-100%; a value outside it renders at the
// nearest end, so it looks like the CSS was ignored.
describe("Archivo width axis", () => {
  const css = readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(css|astro|tsx)$/.test(f))
    .map((f) => readFileSync(join(src, f), "utf8"))
    .join("\n");
  const stretches = [...css.matchAll(/font-stretch:\s*([\d.]+)%/g)].map((m) => Number(m[1]));
  it("finds font-stretch values", () => {
    expect(stretches.length).toBeGreaterThan(0);
  });
  it("keeps every font-stretch within 72-100%", () => {
    expect(stretches.filter((v) => v < 72 || v > 100)).toEqual([]);
  });
  // A keyword, var() or "wdth" setting would slip past the range check above.
  it("uses only percentage font-stretch and no wdth setting", () => {
    expect([...css.matchAll(/font-stretch:\s*(?!\s|[\d.]+%)[^;]+/g)].map((m) => m[0])).toEqual([]);
    expect(css).not.toMatch(WDTH);
  });
});
