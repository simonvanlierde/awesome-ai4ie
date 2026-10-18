import { useEffect, useRef, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { DIM_LABELS, TAG_DIMS, TAGS, type TagDim, tagLabel } from "../data/tags";
import { formatAuthors, isNew, paperLink } from "../lib/literature";
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  emptyMessage,
  type Filter,
  matchesFilter,
  parseView,
  SORTS,
  type SortKey,
  sortEntries,
  toQuery,
} from "./litFilter";
import TagChips from "./TagChips";

/**
 * Tag-filterable reading list. SSRs the full list (filters need JS); the
 * active filter and sort round-trip through URL params so filtered views are
 * shareable and the applications map can deep-link here (by tag or, via
 * `?papers=`, by cited entry ids).
 *
 * Each dimension is a disclosure button rather than a wall of chips. One
 * dimension's chips open at a time, in a panel that sits in the page flow under
 * the bar, so it never covers the active filters or the count. Escape closes it
 * (from its button or a chip) and returns focus to the button. Whatever is
 * actually filtering shows up as removable pills; removing one moves focus to
 * the next pill, or to the count once none is left, never to the page top.
 */
export default function LiteratureBrowser({ entries }: { entries: LitEntry[] }) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<TagDim | null>(null);
  const triggers = useRef<Partial<Record<TagDim, HTMLButtonElement | null>>>({});
  const activeRow = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  // Index of the pill that was just removed: focus goes to whatever takes its place.
  const refocus = useRef<number | null>(null);

  // Read the initial view from the URL after hydration (SSR shows everything).
  useEffect(() => {
    const view = parseView(window.location.search);
    setFilter(view.filter);
    setSort(view.sort);
    setHydrated(true);
  }, []);

  // Keep the shareable URL in sync once the initial URL has been read, so a
  // shared link reproduces both the filter and the order.
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

  function closePanel(dim: TagDim) {
    triggers.current[dim]?.focus();
    setOpen(null);
  }

  function toggle(dim: TagDim, tag: string) {
    const active = filter[dim].includes(tag);
    setFilter({
      ...filter,
      [dim]: active ? filter[dim].filter((t) => t !== tag) : [...filter[dim], tag],
    });
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
      <ol className="lit-list">
        {shown.map((e) => (
          <li key={e.id} className="lit-entry">
            <span className="lit-meta">
              {formatAuthors(e)} · {e.year}
              {/* After hydration only: "new" depends on today, not on the build date. */}
              {hydrated && isNew(e.added) && <span className="lit-new">new</span>}
            </span>
            <a href={paperLink(e).href} className="lit-title">
              {e.title}
            </a>
            <p className="lit-blurb">{e.blurb}</p>
            <span className="lit-tags">
              <TagChips ie={e.ie} ml={e.ml} type={e.type} />
            </span>
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className="lit-empty">{emptyMessage(filter, tagLabel)}</p>}
    </div>
  );
}
