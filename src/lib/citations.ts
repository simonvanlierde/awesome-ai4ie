import type { LitEntry } from "../data/schemas";

export type CitationFormat = "bibtex" | "ris";
/** `source` is the `doi:…` or `arxiv:…` the record was fetched for. */
export type Citations = Record<string, { source: string } & Record<CitationFormat, string>>;
export type CiteEntry = Pick<
  LitEntry,
  "id" | "title" | "authors" | "etAl" | "year" | "doi" | "arxiv"
>;

export const FORMATS: { key: CitationFormat; label: string; ext: string; mime: string }[] = [
  { key: "bibtex", label: "BibTeX", ext: "bib", mime: "application/x-bibtex" },
  { key: "ris", label: "RIS", ext: "ris", mime: "application/x-research-info-systems" },
];

/** Escape the BibTeX specials in one pass, so a `\` added for one is not escaped again. */
export function bibEscape(s: string): string {
  return s.replace(/[\\&%$#_]/g, (c) => (c === "\\" ? "\\textbackslash{}" : `\\${c}`));
}

/** A short record from the YAML fields, for an entry with no cached record yet. */
export function fallbackRecord(e: CiteEntry, format: CitationFormat): string {
  const url = e.doi ? `https://doi.org/${e.doi}` : `https://arxiv.org/abs/${e.arxiv}`;
  if (format === "ris") {
    return [
      `TY  - ${e.doi ? "JOUR" : "GEN"}`,
      ...e.authors.map((a) => `AU  - ${a}`),
      `TI  - ${e.title}`,
      `PY  - ${e.year}`,
      ...(e.doi ? [`DO  - ${e.doi}`] : []),
      `UR  - ${url}`,
      "ER  -",
    ].join("\n");
  }
  // etAl: the YAML list stops early; "and others" is BibTeX's way to say so.
  const authors = [...e.authors, ...(e.etAl ? ["others"] : [])].map(bibEscape).join(" and ");
  return [
    `@${e.doi ? "article" : "misc"}{${e.id},`,
    `  title = {{${bibEscape(e.title)}}},`,
    `  author = {${authors}},`,
    `  year = {${e.year}},`,
    ...(e.doi
      ? [`  doi = {${e.doi}},`]
      : [`  eprint = {${e.arxiv}},`, "  archivePrefix = {arXiv},"]),
    `  url = {${url}},`,
    "}",
  ].join("\n");
}

/** One file for several entries, in the given order, blank-line separated. */
export function citationFile(
  entries: CiteEntry[],
  cache: Citations,
  format: CitationFormat,
): string {
  return `${entries.map((e) => cache[e.id]?.[format] ?? fallbackRecord(e, format)).join("\n\n")}\n`;
}
