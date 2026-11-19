// RSS 2.0 feed of the newest literature entries. Hand-written: the format is
// small and a dependency would add more code than this file.
import { formatAuthors, paperLink } from "./literature";

type FeedEntry = {
  title: string;
  authors: string[];
  etAl: boolean;
  year: number;
  doi?: string;
  arxiv?: string;
  blurb: string;
  added: string;
};

export const FEED_LIMIT = 50;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** First day of the `added` month (YYYY-MM) as an RFC 822 date. */
export function pubDate(added: string): string {
  return new Date(`${added}-01T00:00:00Z`).toUTCString();
}

/** `siteRoot` is the site's absolute URL with its base path and no trailing slash. */
export function buildFeed(entries: FeedEntry[], siteRoot: string): string {
  // Newest month first; the sort is stable, so entries of one month keep file order.
  const newest = [...entries].sort((a, b) => b.added.localeCompare(a.added)).slice(0, FEED_LIMIT);
  const items = newest
    .map((e) => {
      const link = paperLink(e).href;
      const description = `${e.blurb} ${formatAuthors(e)} (${e.year}).`;
      return `    <item>
      <title>${esc(e.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${pubDate(e.added)}</pubDate>
      <description>${esc(description)}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI4IE: new literature</title>
    <link>${esc(siteRoot)}/literature/</link>
    <description>New papers in the reading list, part of a proposal for the AI4IE working group.</description>
    <language>en</language>
${newest.length ? `    <lastBuildDate>${pubDate(newest[0].added)}</lastBuildDate>\n` : ""}    <atom:link href="${esc(siteRoot)}/literature/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
