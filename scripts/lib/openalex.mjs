// OpenAlex helpers shared by the scripts that read works by DOI. The API key is optional:
// a free one (OPENALEX_API_KEY) gives ten times the keyless daily budget.
import { createHash } from "node:crypto";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

export const UA = "awesome-ai4ie (https://github.com/simonvanlierde/awesome-ai4ie)";

/** OpenAlex stores abstracts as word → positions; rebuild the text. */
export function abstractText(index) {
  if (!index) return "";
  const words = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.filter(Boolean).join(" ");
}

/** sha256 of the abstract, or null when the work has none. The text itself is publisher
 * copyright and never committed; the hash only tells a later run the abstract changed. */
export function abstractHash(index) {
  const text = abstractText(index);
  return text ? createHash("sha256").update(text).digest("hex") : null;
}

const DOI_URL = /^https:\/\/doi\.org\//;

export function bareDoi(doi) {
  return doi?.replace(DOI_URL, "").toLowerCase();
}

/** An entry's DOI, lower case. An arXiv id counts as its DataCite DOI, which is how OpenAlex
 * names a preprint. */
export function entryDoi(e) {
  return (e.doi ?? (e.arxiv && `10.48550/arxiv.${e.arxiv}`))?.toLowerCase();
}

/** GET /works with the query params, retrying a 429 after 1.5 s. */
export async function openalex(params, retries = 3) {
  const res = await fetch(`https://api.openalex.org/works?${new URLSearchParams(params)}`, {
    headers: {
      "User-Agent": UA,
      ...(process.env.OPENALEX_API_KEY && {
        Authorization: `Bearer ${process.env.OPENALEX_API_KEY}`,
      }),
    },
  });
  // Without a key, a search with more than a few boolean operators runs once a second.
  if (res.status === 429 && retries > 0) {
    await sleep(1500);
    return openalex(params, retries - 1);
  }
  if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Works by DOI, as a Map from bare DOI to work; DOIs OpenAlex does not know are absent. */
export async function worksByDoi(dois, select) {
  const out = new Map();
  for (let i = 0; i < dois.length; i += 50) {
    const { results } = await openalex({
      filter: `doi:${dois.slice(i, i + 50).join("|")}`,
      "per-page": "50",
      select,
    });
    for (const w of results) out.set(bareDoi(w.doi), w);
  }
  return out;
}

/** What literature-meta.json keeps of a work: ids and the primary topic, never the abstract. */
export function metaRow(work) {
  const t = work.primary_topic;
  return {
    openalex: work.id.replace("https://openalex.org/", ""),
    topic: t ? { id: t.id.replace("https://openalex.org/", ""), name: t.display_name } : null,
    abstract: abstractHash(work.abstract_inverted_index),
  };
}
