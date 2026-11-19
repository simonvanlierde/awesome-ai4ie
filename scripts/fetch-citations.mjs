// Fetch BibTeX and RIS for every literature entry into src/data/citations.json.
//
//   pnpm run citations             fetch only ids missing from the cache
//   pnpm run citations -- --refresh  refetch everything
//
// DOI entries come from Crossref/DataCite content negotiation at doi.org;
// arXiv-only entries come from the arXiv Atom API and are formatted here. Every
// run passes the whole cache through `normalise` (no network needed), so a
// change to it applies to the stored records too. Each record keeps the
// `source` (doi:… or arxiv:…) it was fetched for, and is refetched when the
// YAML entry points elsewhere. The build never touches the network.
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { parse } from "yaml";
import { bibEscape } from "../src/lib/citations.ts";

const UA = "awesome-ai4ie-citations (https://github.com/simonvanlierde/awesome-ai4ie)";
const YAML_PATH = new URL("../src/data/literature.yaml", import.meta.url);
const CACHE_PATH = new URL("../src/data/citations.json", import.meta.url);

/** Make `id` the citation key of the first BibTeX entry. */
export function rekeyBibtex(bibtex, id) {
  const out = bibtex.trim().replace(/^@(\w+)\s*\{[^,\s]*\s*,/, `@$1{${id},`);
  if (!out.startsWith(`@`) || !out.includes(`{${id},`)) throw new Error("not a BibTeX entry");
  return out;
}

function decode(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull the fields we need out of one arXiv Atom feed (first entry). */
export function parseAtom(xml) {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) throw new Error("no <entry> in arXiv response");
  function tag(t) {
    return entry.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1];
  }
  const title = decode(tag("title") ?? "");
  const published = tag("published") ?? "";
  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) =>
    decode(m[1]),
  );
  const category = entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)?.[1];
  if (!title || !/^\d{4}/.test(published) || authors.length === 0) {
    throw new Error("arXiv entry lacks title, date or authors");
  }
  return { title, year: published.slice(0, 4), authors, category };
}

export function arxivBibtex(id, key, { title, year, authors, category }) {
  return [
    `@misc{${key},`,
    `  title = {{${bibEscape(title)}}},`,
    `  author = {${authors.map(bibEscape).join(" and ")}},`,
    `  year = {${year}},`,
    `  eprint = {${id}},`,
    `  archivePrefix = {arXiv},`,
    ...(category ? [`  primaryClass = {${category}},`] : []),
    `  url = {https://arxiv.org/abs/${id}},`,
    `}`,
  ].join("\n");
}

export function arxivRis(id, { title, year, authors }) {
  return [
    "TY  - GEN",
    ...authors.map((a) => `AU  - ${a}`),
    `TI  - ${title}`,
    `PY  - ${year}`,
    `UR  - https://arxiv.org/abs/${id}`,
    `N1  - arXiv:${id}`,
    "ER  - ",
  ].join("\n");
}

async function get(url, accept) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function fetchEntry({ id, doi, arxiv }) {
  if (doi) {
    const bibtex = rekeyBibtex(await get(`https://doi.org/${doi}`, "application/x-bibtex"), id);
    const ris = (await get(`https://doi.org/${doi}`, "application/x-research-info-systems")).trim();
    if (!/^TY {2}- /.test(ris) || !/ER {2}-$/.test(ris)) throw new Error("not an RIS record");
    return { bibtex, ris };
  }
  const atom = parseAtom(
    await get(`https://export.arxiv.org/api/query?id_list=${arxiv}`, "application/atom+xml"),
  );
  return { bibtex: arxivBibtex(arxiv, id, atom), ris: arxivRis(arxiv, atom) };
}

/**
 * What a record was fetched for: the DOI when there is one, else the arXiv id.
 * @param {{ doi?: string, arxiv?: string }} entry
 */
export function sourceOf({ doi, arxiv }) {
  return doi ? `doi:${doi}` : `arxiv:${arxiv}`;
}

export const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

/** CRLF to LF, HTML entities decoded (also double-encoded ones), markup tags dropped. */
export function cleanText(s) {
  let out = s.replace(/\r\n?/g, "\n");
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_m, c) => {
      const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[c.toLowerCase()];
      if (named) return named;
      return String.fromCodePoint(
        c[1] === "x" ? Number.parseInt(c.slice(2), 16) : Number(c.slice(1)),
      );
    });
  }
  // Repeat until stable: removing one tag can join the halves of another.
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/<\/?[a-z][^<>]*>/gi, "");
  }
  return out;
}

/** Clean BibTeX: whitespace collapsed inside braced values, bare `&` escaped, month as a macro, year from the YAML. */
export function normaliseBibtex(bibtex, year) {
  let out = "";
  let depth = 0;
  for (const ch of cleanText(bibtex).trim()) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth >= 2 && /\s/.test(ch)) {
      if (!out.endsWith(" ")) out += " ";
    } else out += ch;
  }
  out = out
    .replace(/(?<!\\)&/g, "\\&")
    .replace(/(\bmonth\s*=\s*)\{?([A-Za-z]+)\.?\}?/, (m, pre, name) => {
      const i = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
      return i < 0 ? m : pre + MONTHS[i];
    });
  const served = out.match(/\byear\s*=\s*\{?(\d{4})\}?/);
  if (served && served[1] !== String(year)) {
    // The month belongs to the served year (often the online-first date), so it goes too.
    out = out
      .replace(/,\s*month\s*=\s*\w+/, "")
      .replace(/(\byear\s*=\s*)\{?\d{4}\}?/, `$1{${year}}`);
  }
  return out;
}

/** Clean RIS: one field per line (continuation lines folded in), whitespace collapsed, PY/Y1/DA on the YAML year. */
export function normaliseRis(ris, year) {
  const fields = [];
  for (const line of cleanText(ris).split("\n")) {
    const m = line.match(/^([A-Z][A-Z0-9]) {2}-(.*)$/);
    if (m) fields.push([m[1], m[2]]);
    else if (fields.length > 0) fields[fields.length - 1][1] += ` ${line}`;
  }
  return fields
    .map(([tag, raw]) => {
      let value = raw.replace(/\s+/g, " ").trim();
      if (["PY", "Y1", "DA"].includes(tag) && !value.startsWith(String(year))) value = String(year);
      return `${tag}  - ${value}`;
    })
    .join("\n")
    .trim();
}

export function normalise(record, entry) {
  return {
    source: record.source,
    bibtex: normaliseBibtex(record.bibtex, entry.year),
    ris: normaliseRis(record.ris, entry.year),
  };
}

function sleep() {
  return new Promise((r) => setTimeout(r, 1500));
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const entries = parse(await readFile(YAML_PATH, "utf8"));
  const cache = refresh ? {} : JSON.parse(await readFile(CACHE_PATH, "utf8").catch(() => "{}"));
  const known = new Set(entries.map((e) => e.id));
  for (const id of Object.keys(cache)) if (!known.has(id)) delete cache[id];

  const failed = [];
  const todo = entries.filter((e) => cache[e.id]?.source !== sourceOf(e));
  for (const [i, e] of todo.entries()) {
    const n = `${i + 1}/${todo.length}`;
    try {
      cache[e.id] = { source: sourceOf(e), ...(await fetchEntry(e)) };
      console.log(`${n} ok    ${e.id}`);
    } catch (err) {
      delete cache[e.id];
      failed.push(e.id);
      console.error(`${n} FAIL  ${e.id}: ${err.message}`);
    }
    if (i < todo.length - 1) await sleep();
  }
  for (const e of entries) if (cache[e.id]) cache[e.id] = normalise(cache[e.id], e);
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  if (failed.length > 0) {
    console.error(`${failed.length} failed; rerun to retry: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
