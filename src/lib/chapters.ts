/** The site's five chapters, numbered in sidebar order (astro.config.mjs). The
 * number picks the chapter's ink (--ink-1 … --ink-5 in custom.css), which the
 * sidebar tabs, running heads and the home index share. */
export const CHAPTERS = [
  {
    slug: "applications-map",
    title: "Map of AI applications",
    gist: "What works today, by IE field and AI technique",
  },
  {
    slug: "literature",
    title: "Literature & resources",
    gist: "The papers behind each claim, filterable by tag",
  },
  {
    slug: "best-practices",
    title: "Best practices & guides",
    gist: "Pitfalls, checklists, prompts and skills",
  },
  {
    slug: "tools",
    title: "Tools & hardware",
    gist: "What to run, and where, including local options",
  },
  { slug: "demos", title: "Demos", gist: "Try a method in your browser" },
] as const;

/** Chapter number (1-based) and entry for a docs page id, or undefined on the home page. */
export function chapterOf(id: string) {
  const i = CHAPTERS.findIndex((c) => c.slug === id.split("/")[0]);
  return i < 0 ? undefined : { n: i + 1, ...CHAPTERS[i] };
}
