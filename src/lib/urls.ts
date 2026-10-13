import { DEFAULT_SORT, EMPTY_FILTER, type Filter, toQuery } from "../components/litFilter";

// Base-absolute (reads the configured base) so links resolve regardless of the
// trailing slash on the current URL, and survive a repo rename.
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const ABSOLUTE = /^https?:\/\//;
const LEADING_SLASH = /^\//;

/** A site-relative path resolved against the base; full URLs pass through unchanged. */
export function siteUrl(pathOrUrl: string): string {
  return ABSOLUTE.test(pathOrUrl) ? pathOrUrl : BASE + pathOrUrl.replace(LEADING_SLASH, "");
}

/** Literature-page URL with the given filter pre-applied, in the default sort. */
export function litUrl(f: Partial<Filter> = {}): string {
  return siteUrl(
    `literature/${toQuery({ filter: { ...EMPTY_FILTER, ...f }, sort: DEFAULT_SORT })}`,
  );
}
