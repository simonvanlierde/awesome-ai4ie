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
    `literature/${toQuery({ filter: { ...EMPTY_FILTER, ...f }, sort: DEFAULT_SORT })}`,
  );
}

/** The issue forms in .github/ISSUE_TEMPLATE/; forms.test.ts checks each file exists. */
export const ISSUE_FORMS = ["paper", "application", "tool", "other"] as const;
export type IssueForm = (typeof ISSUE_FORMS)[number];

/** A new issue on the given form, with text fields prefilled by their form id.
 * GitHub prefills text inputs and textareas this way, not dropdowns. */
export function issueUrl(form: IssueForm, fields: Record<string, string> = {}): string {
  const query = new URLSearchParams({ template: `${form}.yml`, ...fields });
  return `${repoUrl}/issues/new?${query}`;
}

/** A `repo:` link from page front matter or Markdown as a full GitHub URL;
 * anything else resolves as a site path. */
export function contentUrl(link: string): string {
  return link.startsWith("repo:") ? `${repoUrl}/${link.slice(5)}` : siteUrl(link);
}
