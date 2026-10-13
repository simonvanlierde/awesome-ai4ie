import { TAG_DIMS } from "../data/tags";

export type Filter = { ie: string[]; ml: string[]; type: string[]; papers: string[] };

export type SortKey = "year" | "authors" | "title";

/** Everything the literature list shows that a shared URL must reproduce. */
export type View = { filter: Filter; sort: SortKey };

type Tagged = { id?: string; ie?: string[]; ml?: string[]; type?: string[] };

const KEYS = [...TAG_DIMS, "papers"] as const;

export const EMPTY_FILTER: Filter = { ie: [], ml: [], type: [], papers: [] };
export const DEFAULT_SORT: SortKey = "year";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "year", label: "Newest first" },
  { key: "authors", label: "Author A–Z" },
  { key: "title", label: "Title A–Z" },
];

/** Active dimensions AND together; tags within one dimension OR together.
 * `papers` narrows to specific entry ids (the applications map links by id). */
export function matchesFilter(entry: Tagged, f: Filter): boolean {
  if (f.papers.length > 0 && !f.papers.includes(entry.id ?? "")) return false;
  return TAG_DIMS.every((d) => f[d].length === 0 || (entry[d] ?? []).some((t) => f[d].includes(t)));
}

/** Read a view from a query string. Unknown keys and unknown sort values are ignored. */
export function parseView(search: string): View {
  const params = new URLSearchParams(search);
  const get = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const s = params.get("sort");
  return {
    filter: { ie: get("ie"), ml: get("ml"), type: get("type"), papers: get("papers") },
    sort: SORTS.find((o) => o.key === s)?.key ?? DEFAULT_SORT,
  };
}

/** Query string for a view ("" for the default view). The default sort is left
 * out to keep the common URL clean.
 * NOTE: plain string build, no URLSearchParams: tag slugs, sort keys and
 * citation keys are alphanumeric/kebab-case and never need percent-escaping. */
export function toQuery({ filter, sort }: View): string {
  const parts = KEYS.filter((k) => filter[k].length > 0).map((k) => `${k}=${filter[k].join(",")}`);
  if (sort !== DEFAULT_SORT) parts.push(`sort=${sort}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

type Sortable = { year: number; authors: string; title: string };

/** Return a sorted copy: year descending, author/title ascending, each with a
 * secondary key so ties order deterministically. */
export function sortEntries<T extends Sortable>(entries: T[], key: SortKey): T[] {
  const cmp: Record<SortKey, (a: Sortable, b: Sortable) => number> = {
    year: (a, b) => b.year - a.year || a.authors.localeCompare(b.authors),
    authors: (a, b) => a.authors.localeCompare(b.authors) || b.year - a.year,
    title: (a, b) => a.title.localeCompare(b.title) || b.year - a.year,
  };
  return [...entries].sort(cmp[key]);
}
