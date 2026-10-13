// How a literature.yaml entry reads on the page: author lists, citation
// labels, the paper link and the "new" marker. Pure functions over entry fields,
// so the list, <Cite> and sorting all show an entry the same way.

type Authored = { authors: readonly string[]; etAl?: boolean };

/** "Preuss, N." -> "Preuss". */
export function surname(author: string): string {
  return author.split(",")[0].trim();
}

/** Full author line: "Preuss, N., Alshehri, A. S. & You, F." or "Donati, F., et al." */
export function formatAuthors({ authors, etAl }: Authored): string {
  const listed =
    authors.length > 1 ? `${authors.slice(0, -1).join(", ")} & ${authors.at(-1)}` : authors[0];
  return etAl ? `${listed}, et al.` : listed;
}

/** Author part of an in-text citation: "Peled & Fishman", "Donati et al.". */
export function citeAuthors({ authors, etAl }: Authored): string {
  if (etAl || authors.length > 2) return `${surname(authors[0])} et al.`;
  return authors.map(surname).join(" & ");
}

/** Where the title links, and how the link is labelled in a tooltip. A DOI wins
 * over an arXiv id when an entry has both. */
export function paperLink({ doi, arxiv }: { doi?: string; arxiv?: string }): {
  href: string;
  label: string;
} {
  if (doi) return { href: `https://doi.org/${doi}`, label: `DOI ${doi}` };
  if (arxiv) return { href: `https://arxiv.org/abs/${arxiv}`, label: `arXiv ${arxiv}` };
  throw new Error("entry has neither doi nor arxiv"); // the schema refine rules this out
}

const NEW_FOR_MS = 60 * 24 * 60 * 60 * 1000;

/** True when `added` (YYYY-MM) is within the last 60 days. `added` has month
 * precision, so the 60 days count from the first of that month. */
export function isNew(added: string, now: Date = new Date()): boolean {
  const [y, m] = added.split("-").map(Number);
  const age = now.getTime() - Date.UTC(y, m - 1, 1);
  return age >= 0 && age < NEW_FOR_MS;
}
