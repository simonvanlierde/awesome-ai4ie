import type { ContributionType } from "../../worker/contribute";
import { DEFAULT_SORT, EMPTY_FILTER, type Filter, toQuery } from "../components/litFilter";
import { repoUrl } from "../site";

// Base-absolute (reads the configured base) so links resolve regardless of the
// trailing slash on the current URL, and survive a repo rename.
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const ABSOLUTE = /^https?:\/\//;
const LEADING_SLASH = /^\//;

/** A site-relative path resolved against the base; full URLs and paths that
 * already carry the base pass through unchanged. */
export function siteUrl(pathOrUrl: string): string {
  if (ABSOLUTE.test(pathOrUrl) || pathOrUrl.startsWith(BASE)) return pathOrUrl;
  return BASE + pathOrUrl.replace(LEADING_SLASH, "");
}

/** Literature-page URL with the given filter pre-applied, in the default sort. */
export function litUrl(f: Partial<Filter> = {}): string {
  return siteUrl(
    `literature/${toQuery({ filter: { ...EMPTY_FILTER, ...f }, sort: DEFAULT_SORT, q: "" })}`,
  );
}

/** One paper on the reading list: the list opens with its card expanded. */
export function paperUrl(id: string): string {
  return siteUrl(`literature/#${id}`);
}

/** One application on the map: described in full on its first field's page, under its own id. */
export function appUrl(a: { id: string; ie: readonly string[] }): string {
  return siteUrl(`applications-map/${a.ie[0]}/#${a.id}`);
}

/** The on-site contribution form with its type picked and text fields
 * prefilled; ContributeForm reads these query keys. Needs no GitHub account. */
export function contributeUrl(
  type: ContributionType,
  fields: { title?: string; details?: string } = {},
): string {
  const query = new URLSearchParams({ type, ...fields });
  return siteUrl(`contribute/?${query}#send-a-contribution`);
}

/** A `repo:` link from page front matter or Markdown as a full GitHub URL;
 * anything else resolves as a site path. */
export function contentUrl(link: string): string {
  return link.startsWith("repo:") ? `${repoUrl}/${link.slice(5)}` : siteUrl(link);
}
