import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  arxivBibtex,
  arxivRis,
  MONTHS,
  normaliseBibtex,
  normaliseRis,
  parseAtom,
  rekeyBibtex,
  sourceOf,
} from "../../scripts/fetch-citations.mjs";
import { type Citations, type CiteEntry, citationFile, fallbackRecord } from "./citations";

const cache = JSON.parse(readFileSync("src/data/citations.json", "utf8")) as Citations;
const lit = parse(readFileSync("src/data/literature.yaml", "utf8")) as CiteEntry[];

const RIS_RECORD = /^TY {2}- [\s\S]*ER {2}-$/;
const ENTITY = /&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/i;
const TAG = /<\/?[a-z][^<>]*>/i;
const BARE_AMP = /(?<!\\)&/;
const MONTH_FIELD = /\bmonth\s*=\s*(\S+?)[,\s}]/g;
const RIS_DATE = /^(?:PY|Y1|DA) {2}- (.*)$/gm;

describe("citations.json", () => {
  it("lists the entries that export a short fallback record", () => {
    const missing = lit.filter((e) => !cache[e.id]).map((e) => e.id);
    if (missing.length > 0) {
      // biome-ignore lint/suspicious/noConsole: the coverage gap is a warning, not a failure
      console.warn(`No full citation record (run \`pnpm run citations\`): ${missing.join(", ")}`);
    }
  });
  const byId = new Map(lit.map((e) => [e.id, e]));
  it.each(Object.entries(cache))("%s is a clean record for its YAML entry", (id, rec) => {
    const e = byId.get(id);
    expect(e, "stale id: run `pnpm run citations`").toBeDefined();
    if (!e) return;
    expect(rec.source, "fetched for another doi/arxiv: run `pnpm run citations`").toBe(sourceOf(e));
    expect(rec.bibtex).toMatch(new RegExp(`^@\\w+\\{${id},`));
    expect(rec.ris).toMatch(RIS_RECORD);
    for (const text of [rec.bibtex, rec.ris]) {
      expect(text).not.toMatch(ENTITY);
      expect(text).not.toMatch(TAG);
      expect(text).not.toContain("\r");
    }
    expect(rec.bibtex).not.toMatch(BARE_AMP);
    for (const m of rec.bibtex.matchAll(MONTH_FIELD)) expect(MONTHS).toContain(m[1]);
    expect(rec.bibtex).toMatch(new RegExp(`\\byear\\s*=\\s*\\{${e.year}\\}`));
    for (const m of rec.ris.matchAll(RIS_DATE)) {
      expect(m[1].startsWith(String(e.year))).toBe(true);
    }
  });
});

describe("normalise", () => {
  it("decodes entities, drops tags, collapses whitespace and escapes a bare &", () => {
    const raw =
      "@article{k, title={Green\r\n      <scp>AI</scp> &amp;amp; Co}, journal={A \\& B}, year={2023}, month=Sept }";
    expect(normaliseBibtex(raw, 2023)).toBe(
      "@article{k, title={Green AI \\& Co}, journal={A \\& B}, year={2023}, month=sep }",
    );
  });
  it("takes the year from the YAML and drops the month that went with the served one", () => {
    expect(normaliseBibtex("@article{k, year={2019}, month=Nov, pages={1} }", 2020)).toBe(
      "@article{k, year={2020}, pages={1} }",
    );
  });
  it("folds RIS continuation lines, ends at ER and sets the year", () => {
    const raw =
      "TY  - JOUR\r\nTI  - A &amp; B\r\nAB  - one\r\n  two\r\nPY  - 2019\r\nDA  - 2019/11/24\r\nER  - \r\n";
    expect(normaliseRis(raw, 2020)).toBe(
      "TY  - JOUR\nTI  - A & B\nAB  - one two\nPY  - 2020\nDA  - 2020\nER  -",
    );
  });
});

describe("rekeyBibtex", () => {
  it("replaces the Crossref key and leaves the fields alone", () => {
    const raw = " @article{Donati_2022, title={A, b}, year={2022} }\n";
    expect(rekeyBibtex(raw, "donati2022")).toBe("@article{donati2022, title={A, b}, year={2022} }");
  });
  it("rejects text that is not BibTeX", () => {
    expect(() => rekeyBibtex("<html>Not found</html>", "x")).toThrow();
  });
});

const atom = `<feed><entry><id>http://arxiv.org/abs/1706.03762v7</id>
<published>2017-06-12T17:57:34Z</published><title>Attention &amp; Co:
 A Title</title>
<author><name>Ashish Vaswani</name></author><author><name>Noam Shazeer</name></author>
<arxiv:primary_category xmlns:arxiv="x" term="cs.CL" scheme="s"/></entry></feed>`;

describe("arXiv formatting", () => {
  const rec = parseAtom(atom);
  it("reads the Atom fields", () => {
    expect(rec).toEqual({
      title: "Attention & Co: A Title",
      year: "2017",
      authors: ["Ashish Vaswani", "Noam Shazeer"],
      category: "cs.CL",
    });
  });
  it("writes BibTeX with the id as key and escaped specials", () => {
    const bib = arxivBibtex("1706.03762", "vaswani2017", rec);
    expect(bib).toContain("@misc{vaswani2017,");
    expect(bib).toContain("title = {{Attention \\& Co: A Title}}");
    expect(bib).toContain("author = {Ashish Vaswani and Noam Shazeer}");
  });
  it("escapes a backslash before the other specials", () => {
    const bib = arxivBibtex("1706.03762", "k", { ...rec, title: "a\\b_c" });
    expect(bib).toContain("title = {{a\\textbackslash{}b\\_c}}");
  });
  it("writes RIS", () => {
    expect(arxivRis("1706.03762", rec)).toBe(
      [
        "TY  - GEN",
        "AU  - Ashish Vaswani",
        "AU  - Noam Shazeer",
        "TI  - Attention & Co: A Title",
        "PY  - 2017",
        "UR  - https://arxiv.org/abs/1706.03762",
        "N1  - arXiv:1706.03762",
        "ER  - ",
      ].join("\n"),
    );
  });
  it("rejects an empty feed", () => {
    expect(() => parseAtom("<feed></feed>")).toThrow();
  });
});

const doiEntry: CiteEntry = {
  id: "a",
  title: "Cats & dogs_",
  authors: ["Doe, J.", "Roe, R."],
  etAl: true,
  year: 2024,
  doi: "10.1000/x_1",
};
const arxivEntry: CiteEntry = {
  id: "b",
  title: "B",
  authors: ["Poe, E."],
  etAl: false,
  year: 2017,
  arxiv: "1706.03762",
};

describe("fallbackRecord", () => {
  it("writes an escaped @article with `and others` for a cut-short author list", () => {
    expect(fallbackRecord(doiEntry, "bibtex")).toBe(
      [
        "@article{a,",
        "  title = {{Cats \\& dogs\\_}},",
        "  author = {Doe, J. and Roe, R. and others},",
        "  year = {2024},",
        "  doi = {10.1000/x_1},",
        "  url = {https://doi.org/10.1000/x_1},",
        "}",
      ].join("\n"),
    );
  });
  it("writes an arXiv @misc", () => {
    const bib = fallbackRecord(arxivEntry, "bibtex");
    expect(bib).toContain("@misc{b,");
    expect(bib).toContain("eprint = {1706.03762},");
    expect(bib).toContain("archivePrefix = {arXiv},");
  });
  it("writes RIS with the listed authors only", () => {
    expect(fallbackRecord(doiEntry, "ris")).toBe(
      [
        "TY  - JOUR",
        "AU  - Doe, J.",
        "AU  - Roe, R.",
        "TI  - Cats & dogs_",
        "PY  - 2024",
        "DO  - 10.1000/x_1",
        "UR  - https://doi.org/10.1000/x_1",
        "ER  -",
      ].join("\n"),
    );
    expect(fallbackRecord(arxivEntry, "ris")).toMatch(
      /^TY {2}- GEN\n[\s\S]*UR {2}- https:\/\/arxiv\.org\/abs\/1706\.03762\nER {2}-$/,
    );
  });
});

describe("citationFile", () => {
  it("joins records in order and falls back for an uncached entry", () => {
    const c: Citations = { a: { source: "doi:10.1000/x_1", bibtex: "@a{a,}", ris: "A" } };
    expect(citationFile([arxivEntry, doiEntry], c, "ris")).toBe(
      `${fallbackRecord(arxivEntry, "ris")}\n\nA\n`,
    );
  });
});
