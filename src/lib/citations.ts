export type CitationFormat = "bibtex" | "ris";
export type Citations = Record<string, Record<CitationFormat, string>>;

export const FORMATS: { key: CitationFormat; label: string; ext: string; mime: string }[] = [
  { key: "bibtex", label: "BibTeX", ext: "bib", mime: "application/x-bibtex" },
  { key: "ris", label: "RIS", ext: "ris", mime: "application/x-research-info-systems" },
];

/** One file for several entries: the cached records in the given order, blank-line separated. */
export function citationFile(ids: string[], cache: Citations, format: CitationFormat): string {
  return `${ids.map((id) => cache[id][format]).join("\n\n")}\n`;
}
