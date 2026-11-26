import { currentTag, TAG_DIMS, type TagDim } from "../data/tags";
import { surname } from "../lib/literature";

export type Filter = Record<TagDim, string[]> & { papers: string[] };

export type SortKey = "year" | "authors" | "title";

/** Everything the literature list shows that a shared URL must reproduce. */
export type View = { filter: Filter; sort: SortKey; q: string };

type Tagged = { id?: string } & Partial<Record<TagDim, string[]>>;

const KEYS = [...TAG_DIMS, "papers"] as const;

export const EMPTY_FILTER = Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Filter;
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

/** The text filter: every word of `q` must appear, in any order and case, in the title,
 * authors or blurb. It ANDs with the tag filters. */
export function matchesText(
  entry: { title: string; authors: readonly string[]; blurb: string },
  q: string,
): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${entry.title} ${entry.authors.join(" ")} ${entry.blurb}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Entries the list shows: the first `limit`, or more when a linked paper lies further down. */
export const PAGE_SIZE = 20;
export function visibleCount(limit: number, total: number, targetIndex: number): number {
  return Math.min(total, Math.max(limit, targetIndex + 1));
}

/** Why a filter matches nothing, in the list's own logic: tags within a
 * dimension OR, dimensions AND, all within any `?papers=` selection. */
export function emptyMessage(f: Filter, label: (dim: TagDim, tag: string) => string): string {
  const tags = TAG_DIMS.filter((d) => f[d].length > 0)
    .map((d) => f[d].map((t) => label(d, t)).join(" or "))
    .join(" and ");
  const n = f.papers.length;
  const remove = "Remove one of the filters above.";
  if (n === 1 && !tags) return "The linked paper is not in this list.";
  if (n === 1) return `The linked paper is not tagged ${tags}. ${remove}`;
  if (n > 1 && !tags) return `None of the ${n} linked papers is in this list.`;
  if (n > 1) return `None of the ${n} linked papers is tagged ${tags}. ${remove}`;
  return `No entry is tagged ${tags}. ${remove}`;
}

/** The entry a URL fragment names (`#zhao-2025`), or null when it names none of them. */
export function hashTarget(hash: string, ids: ReadonlySet<string>): string | null {
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null; // a malformed escape, like "#%E0"
  }
  return ids.has(id) ? id : null;
}

/** Read a view from a query string. Unknown keys and unknown sort values are
 * ignored. A retired tag (`?ie=mfa`) reads as its replacement (`?ie=sem`), and
 * a tag that moved dimension follows it (`?ie=uncertainty` to `ml`). A retired tag
 * with no replacement (`?ie=urban-mining`) is dropped, so that filter goes away. */
export function parseView(search: string): View {
  const params = new URLSearchParams(search);
  const get = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const filter = { ...EMPTY_FILTER, papers: get("papers") };
  for (const dim of TAG_DIMS)
    for (const t of get(dim)) {
      const now = currentTag(dim, t);
      if (now && !filter[now.dim].includes(now.tag))
        filter[now.dim] = [...filter[now.dim], now.tag];
    }
  const s = params.get("sort");
  return {
    filter,
    sort: SORTS.find((o) => o.key === s)?.key ?? DEFAULT_SORT,
    q: params.get("q")?.trim() ?? "",
  };
}

/** Query string for a view ("" for the default view). The default sort is left
 * out to keep the common URL clean.
 * NOTE: a plain string build, not URLSearchParams, so the commas between values
 * stay readable. Each value is still escaped: a hand-made URL can carry a `#`
 * or `&` that would otherwise turn into a fragment or a new key. */
export function toQuery({ filter, sort, q }: View): string {
  const parts = KEYS.filter((k) => filter[k].length > 0).map(
    (k) => `${k}=${filter[k].map(encodeURIComponent).join(",")}`,
  );
  if (q.trim()) parts.push(`q=${encodeURIComponent(q.trim())}`);
  if (sort !== DEFAULT_SORT) parts.push(`sort=${sort}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

type Sortable = { year: number; authors: readonly string[]; title: string };

const byAuthor = (a: Sortable, b: Sortable) =>
  surname(a.authors[0]).localeCompare(surname(b.authors[0]), "en");

/** Return a sorted copy: year descending, first author's surname and title
 * ascending, each with a secondary key so ties order deterministically. */
export function sortEntries<T extends Sortable>(entries: T[], key: SortKey): T[] {
  const cmp: Record<SortKey, (a: Sortable, b: Sortable) => number> = {
    year: (a, b) => b.year - a.year || byAuthor(a, b),
    authors: (a, b) => byAuthor(a, b) || b.year - a.year,
    title: (a, b) => a.title.localeCompare(b.title, "en") || b.year - a.year,
  };
  return [...entries].sort(cmp[key]);
}

/** Add `tag` to `filter[dim]`, or remove it if already active. */
export function toggleTag(filter: Filter, dim: TagDim, tag: string): Filter {
  const active = filter[dim].includes(tag);
  return {
    ...filter,
    [dim]: active ? filter[dim].filter((t) => t !== tag) : [...filter[dim], tag],
  };
}
