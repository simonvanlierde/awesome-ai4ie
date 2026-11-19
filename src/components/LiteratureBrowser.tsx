import { useEffect, useRef, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { DIM_LABELS, TAG_DIMS, TAGS, type TagDim, tagLabel } from "../data/tags";
import { type Citations, citationFile, FORMATS } from "../lib/citations";
import { citeAuthors, formatAuthors, isNew, type PaperExtras, paperLink } from "../lib/literature";
import { issueUrl, litUrl, paperUrl, siteUrl } from "../lib/urls";
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  emptyMessage,
  type Filter,
  hashTarget,
  matchesFilter,
  parseView,
  SORTS,
  type SortKey,
  sortEntries,
  toggleTag,
  toQuery,
} from "./litFilter";
import TagChips from "./TagChips";

/**
 * Reading list filtered by tag. The server renders the full list; filtering
 * needs JavaScript. The filter and sort live in the URL, so a filtered view can
 * be shared and the applications map can link here by tag or, through
 * `?papers=`, by entry id.
 *
 * Each dimension is a disclosure button, not a wall of chips. One dimension's
 * chips open at a time, in a panel in the page flow under the bar, so it never
 * covers the active filters or the count. Escape, from the button or a chip,
 * closes the panel and returns focus to the button. Each active filter shows as
 * a removable pill. Removing one moves focus to the next pill, or to the count
 * when none is left, never to the page top.
 *
 * Each entry's Details button opens a panel in the card, under its Cite row: both
 * links when a paper has a DOI and an arXiv id, where its tags lead, the
 * applications that cite it, similar papers, a copyable link and an edit form.
 * `#<id>` in the URL opens that card, marks it and scrolls to it, so a paper has one
 * link to share. Opening a card writes its id there, and closing it hands the
 * fragment to the last card still open. A linked paper the filters hide gets a
 * notice that clears them; a card only opened on the page gets neither mark nor notice.
 */

export default function LiteratureBrowser({
  entries,
  extras = {},
}: {
  entries: LitEntry[];
  extras?: Record<string, PaperExtras>;
}) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<TagDim | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  // The paper a link led to (page load, a Similar link, back or forward), marked on its card.
  const [target, setTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ id: string; text: string } | null>(null);
  // A card to scroll to and focus once it is rendered.
  const pendingScroll = useRef<string | null>(null);
  const triggers = useRef<Partial<Record<TagDim, HTMLButtonElement | null>>>({});
  const activeRow = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  // Index of the pill that was just removed: focus goes to whatever takes its place.
  const refocus = useRef<number | null>(null);

  // Read the initial view from the URL after hydration (SSR shows everything).
  // biome-ignore lint/correctness/useExhaustiveDependencies: entries are fixed for the page's life
  useEffect(() => {
    const view = parseView(window.location.search);
    setFilter(view.filter);
    setSort(view.sort);
    setHydrated(true);
    const ids = new Set(entries.map((e) => e.id));
    const follow = () => {
      const id = hashTarget(window.location.hash, ids);
      setTarget(id);
      if (!id) return;
      setExpanded((cur) => new Set(cur).add(id));
      pendingScroll.current = id;
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  // Scroll to a linked card and move focus there. When the filters hide it, go to the
  // notice instead: the browser already scrolled to the server-rendered card, now gone.
  useEffect(() => {
    const id = pendingScroll.current;
    // Not before the URL's filters are rendered: until then the card is still listed.
    if (!(id && hydrated)) return;
    const to = shown.some((e) => e.id === id)
      ? document.getElementById(id)
      : document.getElementById("lit-hidden-target");
    if (!to) return;
    pendingScroll.current = null;
    to.scrollIntoView({ block: "start" });
    to.focus({ preventScroll: true });
  });

  // Write the filter and sort back to the URL, once the initial view is read.
  useEffect(() => {
    if (!hydrated) return;
    const { pathname, hash } = window.location;
    history.replaceState(null, "", pathname + toQuery({ filter, sort }) + hash);
  }, [filter, sort, hydrated]);

  // After a pill is removed its button is gone; move focus to the pill now in
  // its place, the last one, or the count.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must run after each filter change, once the removed pill has left the DOM
  useEffect(() => {
    const i = refocus.current;
    if (i === null) return;
    refocus.current = null;
    const pills = activeRow.current?.querySelectorAll<HTMLButtonElement>(".lit-pill") ?? [];
    (pills[Math.min(i, pills.length - 1)] ?? countRef.current)?.focus();
  }, [filter]);

  // The records are a separate chunk, fetched on the first export click.
  async function download(picked: LitEntry[], format: (typeof FORMATS)[number], name: string) {
    setExportStatus(""); // so the same message twice is announced twice
    setExportStatus(await exportCitations(picked, format, name));
  }

  function toggleDetails(id: string) {
    const opening = !expanded.has(id);
    setExpanded((cur) => {
      const next = new Set(cur);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    // replaceState fires no hashchange, so this only updates the shareable link.
    const { pathname, search, hash } = window.location;
    if (opening) history.replaceState(null, "", `${pathname}${search}#${id}`);
    else if (hash === `#${id}`) {
      const last = [...expanded].filter((x) => x !== id).at(-1);
      history.replaceState(null, "", pathname + search + (last ? `#${last}` : ""));
    }
    if (!opening && target === id) setTarget(null);
  }

  async function copyLink(e: LitEntry) {
    const url = new URL(paperUrl(e.id), window.location.origin).href;
    setCopied(null);
    // Let the reset render first, so a repeated message is announced again.
    await Promise.resolve();
    try {
      await navigator.clipboard.writeText(url);
      setCopied({ id: e.id, text: "Copied" });
    } catch {
      setCopied({ id: e.id, text: `Copying failed. The link is ${url}` });
    }
  }

  function closePanel(dim: TagDim) {
    triggers.current[dim]?.focus();
    setOpen(null);
  }

  function toggle(dim: TagDim, tag: string) {
    setFilter((current) => toggleTag(current, dim, tag));
  }

  const shown = sortEntries(
    entries.filter((e) => matchesFilter(e, filter)),
    sort,
  );
  // One pill per active tag, plus one for a `?papers=` deep-link, which would
  // otherwise narrow the list with nothing on screen to explain why.
  const pills = TAG_DIMS.flatMap((dim) =>
    filter[dim].map((tag) => ({ id: `${dim}:${tag}`, dim, tag, label: tagLabel(dim, tag) })),
  );
  const anyActive = pills.length > 0 || filter.papers.length > 0;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const hiddenTarget = target && !shown.some((e) => e.id === target) ? byId.get(target) : null;

  return (
    <div className="lit-browser not-content">
      <div className="lit-bar">
        <span className="lit-bar-label">Filter</span>
        {TAG_DIMS.map((dim) => {
          const count = filter[dim].length;
          return (
            <button
              type="button"
              key={dim}
              ref={(el) => {
                triggers.current[dim] = el;
              }}
              className="lit-facet-trigger"
              aria-expanded={open === dim}
              // Only while open: the panel is not in the page otherwise.
              aria-controls={open === dim ? "lit-facet-panel" : undefined}
              onClick={() => setOpen(open === dim ? null : dim)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && open === dim) closePanel(dim);
              }}
            >
              {DIM_LABELS[dim]}
              {count > 0 && <span className="lit-facet-count">{count}</span>}
            </button>
          );
        })}
      </div>
      {open && (
        <fieldset id="lit-facet-panel" className="lit-facet-panel" aria-label={DIM_LABELS[open]}>
          {Object.entries(TAGS[open]).map(([tag, label]) => (
            <button
              type="button"
              key={tag}
              className="lit-chip"
              aria-pressed={filter[open].includes(tag)}
              onClick={() => toggle(open, tag)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closePanel(open);
              }}
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}

      {anyActive && (
        <div className="lit-active" ref={activeRow}>
          {pills.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className="lit-pill"
              aria-label={`Remove filter: ${p.label}`}
              onClick={() => {
                refocus.current = i;
                toggle(p.dim, p.tag);
              }}
            >
              {p.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          {filter.papers.length > 0 && (
            <button
              type="button"
              className="lit-pill"
              aria-label="Remove filter: linked papers"
              onClick={() => {
                refocus.current = pills.length;
                setFilter({ ...filter, papers: [] });
              }}
            >
              {filter.papers.length} linked {filter.papers.length === 1 ? "paper" : "papers"}
              <span aria-hidden="true">×</span>
            </button>
          )}
          <button
            type="button"
            className="lit-clear"
            onClick={() => {
              refocus.current = 0;
              setFilter(EMPTY_FILTER);
            }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="lit-count">
        <span role="status" ref={countRef} tabIndex={-1}>
          {shown.length} of {entries.length} entries
        </span>
        <fieldset className="lit-export" aria-labelledby="lit-export-label">
          <span id="lit-export-label">Export</span>
          {FORMATS.map((f) => (
            <button
              type="button"
              key={f.key}
              className="lit-clear"
              disabled={shown.length === 0}
              onClick={() => download(shown, f, "ai4ie-literature")}
            >
              {f.label}
            </button>
          ))}
        </fieldset>
        <span className="sr-only" aria-live="polite">
          {exportStatus}
        </span>
        <label className="lit-sort">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hiddenTarget && (
        <p id="lit-hidden-target" className="lit-hidden-target" tabIndex={-1}>
          The linked paper, {citeAuthors(hiddenTarget)} {hiddenTarget.year}, is hidden by the
          filters.{" "}
          <button
            type="button"
            className="lit-clear"
            onClick={() => {
              pendingScroll.current = hiddenTarget.id;
              setFilter(EMPTY_FILTER);
            }}
          >
            Clear the filters to show it
          </button>
        </p>
      )}
      <ol className="lit-list">
        {shown.map((e) => (
          <li
            key={e.id}
            id={e.id}
            className="lit-entry"
            data-target={e.id === target || undefined}
            // Focusable by script only, so a linked card takes focus for keyboard users.
            tabIndex={-1}
          >
            <span className="lit-meta">
              {formatAuthors(e)} · {e.year}
              {/* After hydration only: "new" depends on today, not on the build date. */}
              {hydrated && isNew(e.added) && <span className="lit-new">new</span>}
              {e.status === "proposal" && <span className="lit-proposal">proposal</span>}
            </span>
            <a href={paperLink(e).href} className="lit-title">
              {e.title}
            </a>
            <p className="lit-blurb">{e.blurb}</p>
            <span className="lit-tags">
              <TagChips ie={e.ie} topic={e.topic} ml={e.ml} type={e.type} />
            </span>
            <div className="lit-actions">
              <fieldset className="lit-cite" aria-label={`Cite ${e.title}`}>
                Cite
                {FORMATS.map((f) => (
                  <button
                    type="button"
                    key={f.key}
                    className="lit-clear"
                    onClick={() => download([e], f, e.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </fieldset>
              <button
                type="button"
                className="lit-details-toggle"
                aria-expanded={expanded.has(e.id)}
                aria-controls={expanded.has(e.id) ? `${e.id}-details` : undefined}
                aria-label={`Details: ${e.title}`}
                onClick={() => toggleDetails(e.id)}
              >
                Details
              </button>
            </div>
            {expanded.has(e.id) && (
              <PaperDetails
                entry={e}
                extras={extras[e.id]}
                byId={byId}
                onCopy={() => copyLink(e)}
                copyStatus={copied?.id === e.id ? copied.text : ""}
              />
            )}
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className="lit-empty">{emptyMessage(filter, tagLabel)}</p>}
    </div>
  );
}

/** The open half of an entry's card. Rows with nothing to say are left out. */
export function PaperDetails({
  entry: e,
  extras,
  byId,
  onCopy,
  copyStatus = "",
}: {
  entry: LitEntry;
  extras?: PaperExtras;
  byId: Map<string, LitEntry>;
  onCopy: () => void;
  copyStatus?: string;
}) {
  const similar = (extras?.similar ?? []).flatMap((id) => byId.get(id) ?? []);
  const apps = extras?.apps ?? [];
  const more = [
    ...e.ie.map((t) => ({
      key: `ie:${t}`,
      label: tagLabel("ie", t),
      href: siteUrl(`applications-map/${t}/`),
      ie: t,
    })),
    ...e.topic.map((t) => ({
      key: `topic:${t}`,
      label: tagLabel("topic", t),
      href: litUrl({ topic: [t] }),
    })),
    ...e.ml.map((t) => ({ key: `ml:${t}`, label: tagLabel("ml", t), href: litUrl({ ml: [t] }) })),
  ];
  return (
    <dl id={`${e.id}-details`} className="lit-details">
      <dt>Read</dt>
      <dd>
        {e.doi && <a href={`https://doi.org/${e.doi}`}>DOI {e.doi}</a>}
        {e.doi && e.arxiv && " · "}
        {e.arxiv && <a href={`https://arxiv.org/abs/${e.arxiv}`}>arXiv {e.arxiv}</a>}
        {e.etAl && <span className="lit-details-note"> The full author list is there.</span>}
      </dd>
      {more.length > 0 && (
        <>
          <dt>More on</dt>
          <dd className="lit-details-links">
            {more.map((m) => (
              <a
                key={m.key}
                href={m.href}
                className={"ie" in m ? `lit-details-field field-${m.ie}` : undefined}
              >
                {m.label}
              </a>
            ))}
          </dd>
        </>
      )}
      {apps.length > 0 && (
        <>
          <dt>Cited by</dt>
          <dd className="lit-details-links">
            {apps.map((a) => (
              <a key={a.href} href={a.href}>
                {a.name}
              </a>
            ))}
          </dd>
        </>
      )}
      {similar.length > 0 && (
        <>
          <dt>Similar</dt>
          <dd>
            <ul className="lit-similar">
              {similar.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>{" "}
                  <span className="lit-details-note">
                    {citeAuthors(s)}, {s.year}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}
      <dt>Share</dt>
      <dd>
        <button type="button" className="lit-clear" onClick={onCopy}>
          Copy link
        </button>{" "}
        <span className="lit-details-note" aria-live="polite">
          {copyStatus}
        </span>
      </dd>
      <dt>Fix</dt>
      <dd>
        <a
          href={issueUrl("other", {
            title: `[Edit] ${e.title}`,
            what: `Reading-list entry ${e.id}.\n\nWhat should change:`,
          })}
        >
          Suggest an edit
        </a>
      </dd>
    </dl>
  );
}

/** Build a citation download in the browser and return the screen-reader status line. */
export async function exportCitations(
  picked: LitEntry[],
  format: (typeof FORMATS)[number],
  name: string,
  loadCache: () => Promise<Citations> = async () =>
    (await import("../data/citations.json")).default,
): Promise<string> {
  try {
    const cache = await loadCache();
    const blob = new Blob([citationFile(picked, cache, format.key)], {
      type: `${format.mime};charset=utf-8`,
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.${format.ext}`;
    a.click();
    // Revoking in the same task can cancel the download in Firefox and Safari.
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    const n = picked.length;
    return `Exported ${n} ${n === 1 ? "entry" : "entries"} as ${format.label}`;
  } catch {
    return "Export failed, try again";
  }
}
