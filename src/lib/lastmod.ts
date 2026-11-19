// Sitemap <lastmod> dates from git: the last commit that touched a page's source
// file, or one of the data files the page renders. Runs at build time from
// astro.config.mjs.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { IE_TAGS } from "../data/tags";

const LIT = "src/data/literature.yaml";
const APPS = "src/data/applications.yaml";

/** Data files each data-rendered page draws on, by page path (no slashes). */
const DATA: Record<string, string[]> = {
  "": [LIT], // Fig. 1 on the home page
  literature: [LIT],
  "applications-map": [APPS, LIT],
  ...Object.fromEntries(Object.keys(IE_TAGS).map((t) => [`applications-map/${t}`, [APPS, LIT]])),
};

/** The latest of some ISO 8601 dates, or undefined when none is known. */
export function latest(dates: readonly (string | undefined)[]): string | undefined {
  const known = dates.filter((d): d is string => Boolean(d));
  if (known.length === 0) return undefined;
  return known.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

/** Source and data files behind a page path ("" for home, "tools/local-ai"). */
export function sourcesFor(path: string): string[] {
  const stem = `src/content/docs/${path || "index"}`;
  const page = [`${stem}.md`, `${stem}.mdx`, `${stem}/index.md`, `${stem}/index.mdx`].find(
    existsSync,
  );
  return [...(page ? [page] : []), ...(DATA[path] ?? [])];
}

// In a shallow clone every file dates from the one fetched commit, which says
// nothing about the page, so no dates at all.
const shallow = () =>
  execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() ===
  "true";

function lastCommit(file: string): string | undefined {
  const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf8" });
  return out.trim() || undefined;
}

/** Last-modified date for a page path, or undefined without full git history. */
export function lastmod(path: string): string | undefined {
  try {
    if (shallow()) return undefined;
    return latest(sourcesFor(path).map(lastCommit));
  } catch {
    return undefined; // no git, or not a repository: leave the date out
  }
}
