import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { DIM_LABELS, TAG_DIMS, TAGS, type TagDim, tagLabel } from "../data/tags";
import { type Citations, citationFile, FORMATS } from "../lib/citations";
import { citeAuthors, formatAuthors, isNew, type PaperExtras, paperLink } from "../lib/literature";
import type { MapCluster } from "../lib/litmap";
import { contributeUrl, litUrl, paperUrl, siteUrl } from "../lib/urls";
import { MapKey, MapView } from "./LiteratureMapPlot";
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  emptyMessage,
  type Filter,
  hashTarget,
  matchesFilter,
  matchesText,
  PAGE_SIZE,
  parseView,
  SORTS,
  type SortKey,
  sortEntries,
  toggleTag,
  toQuery,
  visibleCount,
} from "./litFilter";
import { decodePoints } from "./litMapNav";
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
 *
 * With `map` (laid out at build time, src/lib/litmap.ts), the map of the literature sits
 * between the count and the list. The same filters drive it: the papers they keep are in full
 * ink, the rest faded. Opening a paper on the map opens its card in the list, as `#<id>` does.
 */

/** The map's layout as the page ships it: points encoded by encodePoints(). */
export type ListMap = { w: number; h: number; clusters: MapCluster[]; points: string };

const FLIP_MS = 220;
const FLIP_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function LiteratureBrowser({
  entries,
  extras = {},
  map,
}: {
  entries: LitEntry[];
  extras?: Record<string, PaperExtras>;
  map?: ListMap;
}) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [q, setQ] = useState("");
  // Entries listed before "Show more". The server renders all of them; this applies after hydration.
  const [limit, setLimit] = useState(PAGE_SIZE);
  // First entry a "Show more" added: it takes focus, so a keyboard user carries on from there.
  const focusAfterMore = useRef<string | null>(null);
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
  const listRef = useRef<HTMLOListElement | null>(null);
  // Pre-update row positions captured right before a filter or sort change.
  const firstRects = useRef<Map<string, DOMRect> | null>(null);
  const flipAnims = useRef<WeakMap<Element, Animation>>(new WeakMap());

  // Read the initial view from the URL after hydration (SSR shows everything).
  // biome-ignore lint/correctness/useExhaustiveDependencies: entries are fixed for the page's life
  useEffect(() => {
    const view = parseView(window.location.search);
    setFilter(view.filter);
    setSort(view.sort);
    setQ(view.q);
    setHydrated(true);
    const ids = new Set(entries.map((e) => e.id));
    const follow = () => {
      const id = hashTarget(window.location.hash, ids);
      if (id) openEntry(id);
      else setTarget(null);
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

  // After "Show more", focus moves to the first entry it added.
  useEffect(() => {
    const id = focusAfterMore.current;
    if (!id) return;
    focusAfterMore.current = null;
    document.getElementById(id)?.focus({ preventScroll: false });
  });

  // Write the filter and sort back to the URL, once the initial view is read.
  useEffect(() => {
    if (!hydrated) return;
    const { pathname, hash } = window.location;
    history.replaceState(null, "", pathname + toQuery({ filter, sort, q }) + hash);
  }, [filter, sort, q, hydrated]);

  // After a pill is removed its button is gone; move focus to the pill now in
  // its place, the last one, or the count.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must run after each filter change, once the removed pill has left the DOM
  useEffect(() => {
    const i = refocus.current;
    if (i === null) return;
    refocus.current = null;
    const pills = activeRow.current?.querySelectorAll<HTMLButtonElement>(".lit-pill") ?? [];
    (pills[Math.min(i, pills.length - 1)] ?? countRef.current)?.focus();
  }, [filter, q]);

  // FLIP: animate rows that stayed visible and moved after a filter or sort change.
  useIsomorphicLayoutEffect(() => {
    const first = firstRects.current;
    firstRects.current = null;
    if (!first || prefersReducedMotion() || !listRef.current) return;
    for (const child of listRef.current.children) {
      const prev = first.get(child.id);
      if (!prev) continue;
      flipAnims.current.get(child)?.cancel();
      const next = child.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      if (typeof child.animate === "function") {
        const anim = child.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          {
            duration: FLIP_MS,
            easing: FLIP_EASING,
          },
        );
        if (anim) flipAnims.current.set(child, anim);
      }
    }
  }, [filter, sort]);

  function captureRows() {
    if (prefersReducedMotion() || !listRef.current) {
      firstRects.current = null;
      return;
    }
    const rects = new Map<string, DOMRect>();
    for (const child of listRef.current.children) {
      if (child.id) rects.set(child.id, child.getBoundingClientRect());
    }
    firstRects.current = rects;
  }

  function updateFilter(next: Filter | ((current: Filter) => Filter)) {
    captureRows();
    setFilter(next);
    setLimit(PAGE_SIZE);
  }

  function updateSort(next: SortKey) {
    captureRows();
    setSort(next);
    setLimit(PAGE_SIZE);
  }

  function updateQuery(next: string) {
    captureRows();
    setQ(next);
    setLimit(PAGE_SIZE);
  }

  /** Mark, open and scroll to an entry's card, as a `#<id>` link does. */
  function openEntry(id: string) {
    setTarget(id);
    setExpanded((cur) => new Set(cur).add(id));
    pendingScroll.current = id;
  }

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

  // Leaving the map: focus goes to the first entry of the list.
  function focusList() {
    listRef.current?.querySelector<HTMLElement>(":scope > li")?.focus();
  }

  function closePanel(dim: TagDim) {
    triggers.current[dim]?.focus();
    setOpen(null);
  }

  function toggle(dim: TagDim, tag: string) {
    updateFilter((current) => toggleTag(current, dim, tag));
  }

  const shown = sortEntries(
    entries.filter((e) => matchesFilter(e, filter) && matchesText(e, q)),
    sort,
  );
  const visible = hydrated
    ? visibleCount(
        limit,
        shown.length,
        shown.findIndex((e) => e.id === target),
      )
    : shown.length;
  // One pill per active tag, plus one for a `?papers=` deep-link, which would
  // otherwise narrow the list with nothing on screen to explain why.
  const pills = TAG_DIMS.flatMap((dim) =>
    filter[dim].map((tag) => ({ id: `${dim}:${tag}`, dim, tag, label: tagLabel(dim, tag) })),
  );
  const tagged = pills.length > 0 || filter.papers.length > 0;
  const anyActive = tagged || q.trim() !== "";
  const byId = new Map(entries.map((e) => [e.id, e]));
  const mapPoints = map ? decodePoints(map.points) : [];
  const shownIds = new Set(shown.map((e) => e.id));
  const onMap = mapPoints.filter((p) => shownIds.has(p.id)).length;
  const hiddenTarget = target && !shown.some((e) => e.id === target) ? byId.get(target) : null;

  return (
    <div className="lit-browser not-content">
      <label className="lit-search">
        <span className="lit-bar-label">Search</span>
        <input
          type="search"
          value={q}
          placeholder="Title, author or summary"
          onChange={(e) => updateQuery(e.target.value)}
        />
      </label>
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
                updateFilter({ ...filter, papers: [] });
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
              updateQuery("");
              updateFilter(EMPTY_FILTER);
            }}
          >
            Clear all
          </button>
          <small>Copy the URL to share this filtered list.</small>
        </div>
      )}

      <div className="lit-count">
        <span role="status" ref={countRef} tabIndex={-1}>
          {shown.length} of {entries.length} entries
          {mapPoints.length > 0 && `, ${onMap} on the map`}
          {visible < shown.length && `, showing the first ${visible}`}
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
          <select value={sort} onChange={(e) => updateSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {map && mapPoints.length > 0 && (
        <figure className="lm-figure">
          <button type="button" className="lm-skip" onClick={focusList}>
            Skip the map
          </button>
          <MapView
            w={map.w}
            h={map.h}
            clusters={map.clusters}
            points={mapPoints}
            byId={byId}
            kept={shownIds}
            onOpen={(id) => {
              openEntry(id);
              const { pathname, search, hash } = window.location;
              if (hash !== `#${id}`) history.pushState(null, "", `${pathname}${search}#${id}`);
            }}
            onLeave={focusList}
          />
          <MapKey />
          <figcaption>
            <b>Fig. 2.1</b> The papers laid out by the meaning of their title, summary and tags:
            nearby papers read alike, and the axes have no unit. The filters above fade the papers
            they leave out.
            {entries.length > mapPoints.length &&
              ` ${entries.length - mapPoints.length} ${entries.length - mapPoints.length === 1 ? "paper has" : "papers have"} no vector yet and ${entries.length - mapPoints.length === 1 ? "is" : "are"} not on the map.`}{" "}
            <a href={siteUrl("literature-map/")}>
              How the map is made, with its clusters as a table
            </a>
          </figcaption>
        </figure>
      )}
      {hiddenTarget && (
        <p id="lit-hidden-target" className="lit-hidden-target" tabIndex={-1}>
          The linked paper, {citeAuthors(hiddenTarget)} {hiddenTarget.year}, is hidden by the
          filters.{" "}
          <button
            type="button"
            className="lit-clear"
            onClick={() => {
              pendingScroll.current = hiddenTarget.id;
              updateQuery("");
              updateFilter(EMPTY_FILTER);
            }}
          >
            Clear the filters to show it
          </button>
        </p>
      )}
      <ol className="lit-list" id="lit-list" ref={listRef}>
        {shown.slice(0, visible).map((e, i) => (
          <li
            key={e.id}
            id={e.id}
            className="lit-entry"
            // Server-rendered entries past the first page: custom.css hides them while scripting
            // is on, so the list does not collapse after hydration. No script, full list.
            data-late={(!hydrated && i >= PAGE_SIZE) || undefined}
            data-target={e.id === target || undefined}
            // Focusable by script only, so a linked card takes focus for keyboard users.
            tabIndex={-1}
          >
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
              <TagChips ie={e.ie} topic={e.topic} ml={e.ml} type={e.type} />
            </span>
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
            {expanded.has(e.id) && (
              <PaperDetails
                entry={e}
                extras={extras[e.id]}
                byId={byId}
                onExport={(format) => download([e], format, e.id)}
                onCopy={() => copyLink(e)}
                copyStatus={copied?.id === e.id ? copied.text : ""}
              />
            )}
          </li>
        ))}
      </ol>
      {visible < shown.length && (
        <button
          type="button"
          className="lit-more"
          onClick={() => {
            focusAfterMore.current = shown[visible]?.id ?? null;
            setLimit(visible + PAGE_SIZE);
          }}
        >
          Show {Math.min(PAGE_SIZE, shown.length - visible)} more ({shown.length - visible} not
          shown)
        </button>
      )}
      {shown.length === 0 && (
        <p className="lit-empty">
          {tagged ? emptyMessage(filter, tagLabel) : "No entry matches that search."}
          {tagged && q.trim() && " The search text narrows the list too."}
        </p>
      )}
    </div>
  );
}

/** The open half of an entry's card. Rows with nothing to say are left out. */
export function PaperDetails({
  entry: e,
  extras,
  byId,
  onExport,
  onCopy,
  copyStatus = "",
}: {
  entry: LitEntry;
  extras?: PaperExtras;
  byId: Map<string, LitEntry>;
  onExport: (format: (typeof FORMATS)[number]) => void;
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
      </dd>
      <dt>Cite</dt>
      <dd className="lit-details-links">
        {FORMATS.map((format) => (
          <button
            key={format.key}
            type="button"
            className="lit-clear"
            onClick={() => onExport(format)}
          >
            {format.label}
          </button>
        ))}
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
      {e.evidence && (
        <>
          <dt>Evidence</dt>
          <dd className="lit-evidence">
            <EvidenceBlock entry={e} evidence={e.evidence} />
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
          href={contributeUrl("other", {
            title: `[Edit] ${e.title}`,
            details: `Reading-list entry ${e.id}.\n\nWhat should change:`,
          })}
        >
          Suggest an edit
        </a>
      </dd>
    </dl>
  );
}

const SOURCE_LABELS = {
  "author-reported": "Author-reported",
  reproduced: "Reproduced",
} as const;

function EvidenceBlock({
  entry: e,
  evidence,
}: {
  entry: LitEntry;
  evidence: NonNullable<LitEntry["evidence"]>;
}) {
  const { dataset, task, method, results } = evidence;
  return (
    <div className="lit-evidence-groups">
      <section className="lit-evidence-group">
        <p className="lit-evidence-heading">Dataset</p>
        <dl className="lit-evidence-list">
          <dt>Identifier</dt>
          <dd>
            {dataset.url ? <a href={dataset.url}>{dataset.identifier}</a> : dataset.identifier}
          </dd>
          <dt>Provenance</dt>
          <dd>{dataset.provenance}</dd>
          <dt>Modality</dt>
          <dd>{dataset.modality}</dd>
          <dt>Access</dt>
          <dd>{dataset.access}</dd>
          <dt>Licence</dt>
          <dd>{dataset.licence}</dd>
        </dl>
      </section>
      <section className="lit-evidence-group">
        <p className="lit-evidence-heading">Task and protocol</p>
        <dl className="lit-evidence-list">
          <dt>Target</dt>
          <dd>{task.target}</dd>
          <dt>Scope</dt>
          <dd>{task.scope}</dd>
          <dt>Split / validation</dt>
          <dd>{task.split}</dd>
          <dt>Metric</dt>
          <dd>{task.metric}</dd>
          <dt>Reference labels</dt>
          <dd>{task.reference}</dd>
        </dl>
      </section>
      <section className="lit-evidence-group">
        <p className="lit-evidence-heading">Method and implementation</p>
        <dl className="lit-evidence-list">
          <dt>Paper</dt>
          <dd>
            {e.doi && <a href={`https://doi.org/${e.doi}`}>DOI {e.doi}</a>}
            {e.doi && e.arxiv && " · "}
            {e.arxiv && <a href={`https://arxiv.org/abs/${e.arxiv}`}>arXiv {e.arxiv}</a>}
          </dd>
          <dt>Repository</dt>
          <dd className={method.repositories.length > 0 ? "lit-details-links" : undefined}>
            {method.repositories.length > 0
              ? method.repositories.map((repo) => (
                  <a key={repo.url} href={repo.url}>
                    {repo.label}
                  </a>
                ))
              : "Not reported."}
          </dd>
          <dt>Revision</dt>
          <dd>{method.revision}</dd>
          <dt>Model / checkpoint</dt>
          <dd>{method.model}</dd>
        </dl>
      </section>
      <section className="lit-evidence-group">
        <p className="lit-evidence-heading">Reported results</p>
        <ul className="lit-evidence-results">
          {results.map((r) => (
            <li key={`${r.source}:${r.metric}:${r.value}`} className="lit-evidence-result">
              <p className="lit-evidence-result-head">
                <span className="lit-evidence-source">{SOURCE_LABELS[r.source]}</span>{" "}
                <strong>{r.metric}:</strong> {r.value}
              </p>
              <dl className="lit-evidence-list">
                <dt>Uncertainty</dt>
                <dd>{r.uncertainty}</dd>
                <dt>Source</dt>
                <dd>{r.locator}</dd>
                <dt>Setting</dt>
                <dd>{r.setting}</dd>
                <dt>Limits</dt>
                <dd>{r.limits}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
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
