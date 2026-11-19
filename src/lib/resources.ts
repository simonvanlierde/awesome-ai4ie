// How resources.yaml entries are picked and shown by <Resources />. Pure
// functions, so the tests cover them without an Astro render.
import type { ResourceEntry, ResourceKind, TOOL_GROUPS } from "../data/schemas";
import type { IeTag, MlTag } from "../data/tags";

export interface ResourceFilter {
  kind?: ResourceKind;
  group?: (typeof TOOL_GROUPS)[number];
  /** An IE tag, "any" for entries with at least one, "none" for entries with none. */
  ie?: IeTag | "any" | "none";
  ml?: MlTag;
}

/** The entries that match every given filter, by title. The collection does not
 * keep the YAML order, and by title nobody has to pick a place for a new entry. */
export function pickResources(entries: ResourceEntry[], f: ResourceFilter): ResourceEntry[] {
  return entries
    .filter(
      (e) =>
        (!f.kind || e.kind === f.kind) &&
        (!f.group || e.group === f.group) &&
        (!f.ml || e.ml.includes(f.ml)) &&
        (!f.ie ||
          (f.ie === "any"
            ? e.ie.length > 0
            : f.ie === "none"
              ? e.ie.length === 0
              : e.ie.includes(f.ie))),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
}

export type TextPart = { text: string; href?: string; code?: boolean };

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`/g;

/** Split entry text into plain runs, Markdown links and `code`, so the
 * component renders them as elements without parsing HTML. */
export function textParts(s: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    if (m.index > last) parts.push({ text: s.slice(last, m.index) });
    parts.push(m[3] !== undefined ? { text: m[3], code: true } : { text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
}
