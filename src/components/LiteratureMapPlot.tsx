import { useEffect, useRef, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { IE_TAGS, shortLabel } from "../data/tags";
import { formatAuthors } from "../lib/literature";
import type { MapCluster } from "../lib/litmap";
import { first, isArrow, type MapPoint, markPath, nearest, step } from "./litMapNav";
import TagChips from "./TagChips";

/** The plate: hulls, marks and labels. Shared by the static figure on /literature-map/
 * (`href` set: each mark is a link) and the map on /literature/ (no links; MapView handles
 * pointer and keys). `out` marks the papers the list's filters leave out. */
export function MapPlot({
  w,
  h,
  clusters,
  points,
  fieldOf,
  out,
  active,
  href,
  title,
}: {
  w: number;
  h: number;
  clusters: readonly MapCluster[];
  points: readonly MapPoint[];
  fieldOf: (id: string) => string | undefined;
  out?: ReadonlySet<string>;
  active?: MapPoint | null;
  href?: (id: string) => string;
  title?: (id: string) => string;
}) {
  const mark = (p: MapPoint) => {
    const field = fieldOf(p.id);
    const cls = `lm-dot ${field ? `field-${field}` : "lm-none"}${out?.has(p.id) ? " is-out" : ""}`;
    const path = <path className={cls} d={markPath(field, p.x, p.y)} />;
    if (!href) return <g key={p.id}>{path}</g>;
    return (
      <a key={p.id} href={href(p.id)} aria-label={title?.(p.id)}>
        <circle className="lm-hit" cx={p.x} cy={p.y} r="12" />
        {path}
      </a>
    );
  };
  // Papers the filters leave out go first, so the ones they keep draw on top.
  const kept = out ? points.filter((p) => !out.has(p.id)) : points;
  // With links the plate is a named group; without, MapView's frame names it and it is hidden.
  const a11y = href
    ? { role: "group", "aria-label": "Map of the literature" }
    : { "aria-hidden": true as const };
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: named by aria-label, or hidden behind MapView's named frame; a <title> would show as a tooltip over the plate
    <svg className="lm-plot" viewBox={`0 0 ${w} ${h}`} {...a11y}>
      {clusters.map((k) => (
        <path key={k.name} className={`lm-hull${k.thin ? " is-thin" : ""}`} d={k.d} />
      ))}
      {out && points.filter((p) => out.has(p.id)).map(mark)}
      {kept.map(mark)}
      {active && <circle className="lm-active" cx={active.x} cy={active.y} r="10" />}
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a <g> of text, never focusable; Table 2.1 names the clusters */}
      <g className="lm-labels" aria-hidden="true">
        {clusters.map((k) => (
          <text key={k.name} className="lm-label" x={k.lx} y={k.ly} textAnchor="middle">
            {k.name} <tspan className="lm-n">{k.n}</tspan>
          </text>
        ))}
      </g>
    </svg>
  );
}

/** The key under the plate: one mark per IE field, and the hollow dot for none. */
export function MapKey() {
  const item = (field: string | undefined, label: string) => (
    <li key={label} className={field ? `field-${field}` : undefined}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path className={field ? "lm-dot" : "lm-dot lm-none"} d={markPath(field, 8, 8)} />
      </svg>
      {label}
    </li>
  );
  return (
    <ul className="lm-key" aria-label="Key">
      {Object.keys(IE_TAGS).map((f) => item(f, shortLabel(f)))}
      {item(undefined, "No IE field")}
    </ul>
  );
}

type Via = "mouse" | "touch" | "key";

/** The interactive map on /literature/. One tab stop: arrow keys move to the nearest paper in
 * that direction, Enter opens it in the list, Escape closes the card and then leaves. A mouse
 * shows a paper's card on hover and opens it on click; on touch the first tap shows the card
 * and a second tap on the same paper opens it, as on Fig. 1. Only the papers the filters keep
 * respond; the rest stay faded. */
export function MapView({
  w,
  h,
  clusters,
  points,
  byId,
  kept,
  onOpen,
  onLeave,
}: {
  w: number;
  h: number;
  clusters: readonly MapCluster[];
  points: readonly MapPoint[];
  byId: ReadonlyMap<string, LitEntry>;
  kept: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onLeave: () => void;
}) {
  const [active, setActive] = useState<MapPoint | null>(null);
  const [via, setVia] = useState<Via>("key");
  const pointer = useRef<Via | null>(null);
  const svgBox = useRef<HTMLDivElement | null>(null);
  const live = points.filter((p) => kept.has(p.id));
  const out = new Set(points.filter((p) => !kept.has(p.id)).map((p) => p.id));

  // A filter change that leaves the open paper out closes its card.
  useEffect(() => {
    if (active && !kept.has(active.id)) setActive(null);
  }, [active, kept]);

  const show = (p: MapPoint | null, how: Via) => {
    setActive(p);
    setVia(how);
  };
  // Pointer position in plate units; `reach` is 20 screen pixels in the same units.
  const at = (e: { clientX: number; clientY: number }) => {
    const r = svgBox.current?.getBoundingClientRect();
    if (!r?.width) return null;
    const k = w / r.width;
    return nearest(live, (e.clientX - r.left) * k, (e.clientY - r.top) * k, 20 * k);
  };

  const entry = active ? byId.get(active.id) : undefined;
  const cluster = active ? clusters[active.c] : undefined;
  const hint = {
    mouse: "Click to open it in the list.",
    touch: "Tap it again to open it in the list.",
    key: "Enter opens it in the list, Escape closes.",
  }[via];

  return (
    <div className="lm-view">
      <div
        ref={svgBox}
        className="lm-frame"
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: one tab stop for a 2D widget that reads arrow keys; the list below is the screen-reader path
        tabIndex={0}
        aria-label={`Map of the literature, ${live.length} papers. Arrow keys move between papers, Enter opens one in the list, Escape leaves the map.`}
        onPointerDown={(e) => {
          pointer.current = e.pointerType === "mouse" ? "mouse" : "touch";
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") show(at(e), "mouse");
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && via === "mouse") setActive(null);
        }}
        onClick={(e) => {
          const how = pointer.current ?? "mouse";
          pointer.current = null;
          const p = at(e);
          if (!p) return show(null, how);
          if (how === "mouse" || active?.id === p.id) onOpen(p.id);
          else show(p, "touch");
        }}
        onFocus={() => {
          // Focus from a click or tap: the pointer decides what shows.
          if (!pointer.current && !active) show(first(live), "key");
        }}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (isArrow(e.key)) {
            e.preventDefault();
            const from = active && kept.has(active.id) ? active : null;
            show(from ? (step(live, from, e.key) ?? from) : first(live), "key");
          } else if (e.key === "Enter" && active) {
            e.preventDefault();
            onOpen(active.id);
          } else if (e.key === "Escape") {
            if (active) setActive(null);
            else onLeave();
          }
        }}
      >
        <MapPlot
          w={w}
          h={h}
          clusters={clusters}
          points={points}
          fieldOf={(id) => byId.get(id)?.ie[0]}
          out={out}
          active={active}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {via === "key" && entry ? `${entry.title}, ${entry.year}` : ""}
      </span>
      {entry && active && (
        <div
          className="lm-card"
          data-flip-x={active.x > w * 0.55 || undefined}
          data-flip-y={active.y > h * 0.55 || undefined}
          style={{ left: `${(active.x / w) * 100}%`, top: `${(active.y / h) * 100}%` }}
        >
          <span className="lit-meta">
            {formatAuthors(entry)} · {entry.year}
            {cluster && <span className="lm-card-cluster"> · {cluster.name}</span>}
          </span>
          <p className="lit-title">{entry.title}</p>
          <p className="lit-blurb">{entry.blurb}</p>
          <span className="lit-tags">
            <TagChips ie={entry.ie} topic={entry.topic} ml={entry.ml} type={entry.type} />
          </span>
          <p className="lm-card-hint">{hint}</p>
        </div>
      )}
    </div>
  );
}
