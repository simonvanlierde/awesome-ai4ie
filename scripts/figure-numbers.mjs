/**
 * Checks figure and table numbers on the built site against the rule in CONTRIBUTING.md
 * ("Figure and table numbers"): each label is unique, carries its page's chapter, counts
 * 1, 2, 3 without gaps, and every "Fig. N" or "Table N" in the text names a label that
 * exists, through a link when the label is on another page.
 *
 *   pnpm run build && pnpm run figure-numbers
 */
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { CHAPTERS } from "../src/lib/chapters.ts";

/** Pages in a chapter whose path does not start with the chapter's slug. */
const IN_CHAPTER = { "open-questions": "contribute" };
/** Pages outside the chapters, such as footer pages, each with its own letter. */
const LETTERS = { footprint: "A" };

const SPACE = String.raw`(?:\s|&nbsp;|&#160;)+`;
const LABEL = new RegExp(
  String.raw`<(b|strong)\b[^>]*>\s*(Fig\.|Table)${SPACE}([\w.]+)\s*</\1>`,
  "g",
);
const REF = new RegExp(String.raw`\b(Fig\.|Figure|Table)${SPACE}([A-Z]\.\d+|\d+(?:\.\d+)?)\b`, "g");
const LINK = /<a\b[^>]*>([\s\S]*?)<\/a>/g;
const TAG = /<[^>]*>/g;
const SCRIPT = /<(script|style)\b[\s\S]*?<\/\1>/g;
const INDEX = /\/?index\.html$/;

/** The label prefix a page's numbers take: "" on the home page, "3." in chapter 3. */
export function prefixFor(slug) {
  if (slug === "") return "";
  const first = IN_CHAPTER[slug] ?? slug.split("/")[0];
  const i = CHAPTERS.findIndex((c) => c.slug === first);
  if (i >= 0) return `${i + 1}.`;
  return LETTERS[slug] ? `${LETTERS[slug]}.` : undefined;
}

function url(slug) {
  return slug ? `/${slug}/` : "/";
}

/** The references in a stretch of HTML, labels and tags removed, "Figure" read as "Fig.". */
function refs(html) {
  const text = html.replace(LABEL, "").replace(TAG, " ");
  return [...text.matchAll(REF)].map((m) => `${m[1] === "Table" ? "Table" : "Fig."} ${m[2]}`);
}

/**
 * Problems with the figure and table numbers of a set of built pages.
 * @param {{ slug: string, html: string }[]} pages slug is the path without slashes, "" for home
 * @returns {string[]}
 */
export function numberProblems(pages) {
  const problems = [];
  const where = new Map(); // "Fig. 2.1" -> slug
  const series = new Map(); // "Fig. 2." -> [1, 2]
  const bodies = pages.map(({ slug, html }) => {
    const body = html.replace(SCRIPT, "");
    const prefix = prefixFor(slug);
    let last = { "Fig.": 0, Table: 0 };
    for (const [, , word, num] of body.matchAll(LABEL)) {
      const label = `${word} ${num}`;
      if (where.has(label))
        problems.push(`${label} is on ${url(where.get(label))} and ${url(slug)}`);
      else where.set(label, slug);
      if (prefix === undefined) {
        problems.push(`${url(slug)} has ${label} but is outside the chapters: give it a letter`);
        continue;
      }
      const n = Number(num.slice(prefix.length));
      if (!num.startsWith(prefix) || !Number.isInteger(n) || n < 1) {
        problems.push(`${label} on ${url(slug)} should be ${word} ${prefix}N`);
        continue;
      }
      if (n <= last[word])
        problems.push(`${label} on ${url(slug)} comes after ${word} ${prefix}${last[word]}`);
      last = { ...last, [word]: n };
      const key = `${word} ${prefix}`;
      series.set(key, [...(series.get(key) ?? []), n]);
    }
    return { slug, body };
  });
  for (const [key, ns] of series) {
    const missing = ns.map((_, i) => i + 1).filter((n) => !ns.includes(n));
    if (missing.length) problems.push(`${key}${missing.join(`, ${key}`)} is missing: numbers skip`);
  }
  for (const { slug, body } of bodies) {
    const linked = [...body.matchAll(LINK)].flatMap((m) => refs(m[1]));
    for (const ref of new Set(refs(body))) {
      const target = where.get(ref);
      if (target === undefined) problems.push(`${url(slug)} refers to ${ref}, which no page has`);
      else if (target !== slug && !linked.includes(ref))
        problems.push(`${url(slug)} names ${ref} on ${url(target)} without a link to it`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const files = await readdir("dist", { recursive: true }).catch(() => {
    console.error("No dist/ folder: run `pnpm run build` first.");
    process.exit(1);
  });
  const pages = await Promise.all(
    files
      .filter((f) => f.endsWith("index.html"))
      .sort()
      .map(async (f) => ({
        slug: f.replace(INDEX, ""),
        html: await readFile(`dist/${f}`, "utf8"),
      })),
  );
  const problems = numberProblems(pages);
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log(`Figure and table numbers: ${pages.length} pages, no problems.`);
}
