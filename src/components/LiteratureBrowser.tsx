import { useEffect, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { DIM_LABELS, TAG_DIMS, TAGS, type TagDim, tagLabel } from "../data/tags";
import { formatAuthors, isNew, paperLink } from "../lib/literature";
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
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
 * Each dimension collapses into a native <details> disclosure rather than a
 * wall of chips: `name` makes them mutually exclusive and gives keyboard
 * support for free, so no popover/focus-trap code is needed. Whatever is
 * actually filtering shows up as removable pills, in the same colours the
 * entries below use for the same tags.
 */
export default function LiteratureBrowser({ entries }: { entries: LitEntry[] }) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [hydrated, setHydrated] = useState(false);

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
    history.replaceState(null, "", window.location.pathname + toQuery({ filter, sort }));
  }, [filter, sort, hydrated]);

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
            <details className="lit-facet" name="lit-facet" key={dim}>
              <summary className="lit-facet-trigger">
                {DIM_LABELS[dim]}
                {count > 0 && <span className="lit-facet-count">{count}</span>}
              </summary>
              <div className="lit-facet-panel">
                {Object.entries(TAGS[dim]).map(([tag, label]) => (
                  <button
                    type="button"
                    key={tag}
                    className="lit-chip"
                    aria-pressed={filter[dim].includes(tag)}
                    onClick={() => toggle(dim, tag)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      {anyActive && (
        <div className="lit-active">
          {pills.map((p) => (
            <button
              type="button"
              key={p.id}
              className="lit-pill"
              aria-label={`Remove filter: ${p.label}`}
              onClick={() => toggle(p.dim, p.tag)}
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
              onClick={() => setFilter({ ...filter, papers: [] })}
            >
              {filter.papers.length} linked {filter.papers.length === 1 ? "paper" : "papers"}
              <span aria-hidden="true">×</span>
            </button>
          )}
          <button type="button" className="lit-clear" onClick={() => setFilter(EMPTY_FILTER)}>
            Clear all
          </button>
        </div>
      )}

      <div className="lit-count">
        <span role="status">
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
      {shown.length === 0 && (
        <p className="lit-empty">No entries match this combination. Remove a filter or two.</p>
      )}
    </div>
  );
}
