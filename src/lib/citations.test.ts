import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { arxivBibtex, arxivRis, parseAtom, rekeyBibtex } from "../../scripts/fetch-citations.mjs";
import { type Citations, citationFile } from "./citations";

const cache = JSON.parse(readFileSync("src/data/citations.json", "utf8")) as Citations;
const lit = parse(readFileSync("src/data/literature.yaml", "utf8")) as { id: string }[];

describe("citations.json", () => {
  it("has BibTeX and RIS for every literature entry", () => {
    const missing = lit.filter((e) => !cache[e.id]?.bibtex || !cache[e.id]?.ris).map((e) => e.id);
    expect(missing, "run `pnpm run citations` to fetch these").toEqual([]);
  });
  it("keys each BibTeX entry by its id", () => {
    for (const e of lit) expect(cache[e.id].bibtex).toMatch(new RegExp(`^@\\w+\\{${e.id},`));
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

describe("citationFile", () => {
  it("joins records in order", () => {
    const c: Citations = { a: { bibtex: "@a{a,}", ris: "A" }, b: { bibtex: "@b{b,}", ris: "B" } };
    expect(citationFile(["b", "a"], c, "bibtex")).toBe("@b{b,}\n\n@a{a,}\n");
  });
});
