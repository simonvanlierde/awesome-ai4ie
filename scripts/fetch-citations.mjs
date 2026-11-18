// Fetch BibTeX and RIS for every literature entry into src/data/citations.json.
//
//   pnpm run citations             fetch only ids missing from the cache
//   pnpm run citations -- --refresh  refetch everything
//
// DOI entries come from Crossref/DataCite content negotiation at doi.org; the
// text is stored as served, apart from the BibTeX key, which becomes the entry's
// `id`. arXiv-only entries come from the arXiv Atom API and are formatted here.
// The build never touches the network: it only reads the cache.
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { parse } from "yaml";

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

function bibEscape(s) {
  return s.replace(/([&%$#_])/g, "\\$1");
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
    await sleep();
    const ris = (await get(`https://doi.org/${doi}`, "application/x-research-info-systems")).trim();
    if (!/^TY {2}- /.test(ris) || !/ER {2}-$/.test(ris)) throw new Error("not an RIS record");
    return { bibtex, ris };
  }
  const atom = parseAtom(
    await get(`https://export.arxiv.org/api/query?id_list=${arxiv}`, "application/atom+xml"),
  );
  return { bibtex: arxivBibtex(arxiv, id, atom), ris: arxivRis(arxiv, atom) };
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
  for (const e of entries.filter((e) => !cache[e.id])) {
    try {
      cache[e.id] = await fetchEntry(e);
      console.log(`ok    ${e.id}`);
    } catch (err) {
      failed.push(e.id);
      console.error(`FAIL  ${e.id}: ${err.message}`);
    }
    await sleep();
  }
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  if (failed.length > 0) {
    console.error(`${failed.length} failed; rerun to retry: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
