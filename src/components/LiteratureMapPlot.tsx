import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type { LitEntry } from "../data/schemas";
import { IE_TAGS, shortLabel, tagLabel } from "../data/tags";
import { formatAuthors } from "../lib/literature";
import type { MapCluster } from "../lib/litmap";
import {
  baseView,
  catPath,
  first,
  fitView,
  isArrow,
  keepInView,
  type Legend,
  type MapPoint,
  MODE_LABELS,
  MODE_NONE,
  type Mode,
  markPath,
  NONE_CAT,
  nameWidthPx,
  nearest,
  panBy,
  placeLabels,
  step,
  toPlate,
  type View,
  ZOOM_MAX,
  zoomAt,
  zoomOf,
} from "./litMapNav";
import TagChips from "./TagChips";

/** The plate: hulls, marks and labels. With `href` each mark is a link, the map as the server
 * renders it for a reader without JavaScript; without, MapView handles pointer and keys. `out`
 * marks the papers the list's filters leave out. */
export function MapPlot({
  w,
  h,
  clusters,
  points,
  fieldOf,
  catOf,
  out,
  active,
  href,
  title,
  view,
  zoom = 1,
  labels = true,
}: {
  w: number;
  h: number;
  clusters: readonly MapCluster[];
  points: readonly MapPoint[];
  fieldOf: (id: string) => string | undefined;
  /** A colour mode's category per paper; without it a paper takes its IE field's colour and shape. */
  catOf?: (id: string) => number;
  out?: ReadonlySet<string>;
  active?: MapPoint | null;
  href?: (id: string) => string;
  title?: (id: string) => string;
  /** The window onto the plate; the whole plate without it. */
  view?: View;
  /** CSS divides the marks' scale by this (and drops the phone's larger marks), so MapView
   * can keep them one screen size at any zoom and frame width. */
  zoom?: number;
  /** The cluster names as SVG text; MapView draws them as buttons instead. */
  labels?: boolean;
}) {
  const mark = (p: MapPoint) => {
    const field = fieldOf(p.id);
    const cat = catOf?.(p.id);
    const colour =
      cat === undefined
        ? field
          ? `field-${field}`
          : "lm-none"
        : cat === NONE_CAT
          ? "lm-none"
          : `lm-cat-${cat}`;
    const cls = `lm-dot ${colour}${out?.has(p.id) ? " is-out" : ""}`;
    const d = cat === undefined ? markPath(field, p.x, p.y) : catPath(cat, p.x, p.y);
    const path = <path className={cls} d={d} />;
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
    <svg
      className="lm-plot"
      viewBox={
        view
          ? [view.x, view.y, view.w, view.h].map((n) => +n.toFixed(2)).join(" ")
          : `0 0 ${w} ${h}`
      }
      style={zoom === 1 ? undefined : ({ "--lm-z": zoom, "--lm-mark": 1 } as CSSProperties)}
      {...a11y}
    >
      {clusters.map((k) => (
        <path key={k.name} className={`lm-hull${k.thin ? " is-thin" : ""}`} d={k.d} />
      ))}
      {out && points.filter((p) => out.has(p.id)).map(mark)}
      {kept.map(mark)}
      {active && <circle className="lm-active" cx={active.x} cy={active.y} r="10" />}
      {labels && (
        // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a <g> of text, never focusable; Table 2.1 names the clusters
        <g className="lm-labels" aria-hidden="true">
          {clusters.map((k) => (
            <text key={k.name} className="lm-label" x={k.lx} y={k.ly} textAnchor="middle">
              {k.name} <tspan className="lm-n">{k.n}</tspan>
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

/** The key under the plate: one mark per IE field and the hollow dot for none, or, in a colour
 * mode, one disc per category with its count. */
export function MapKey({ legend }: { legend?: Legend }) {
  const item = (cls: string | undefined, none: boolean, d: string, label: string) => (
    <li key={label} className={cls}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path className={none ? "lm-dot lm-none" : "lm-dot"} d={d} />
      </svg>
      {label}
    </li>
  );
  if (legend)
    return (
      <>
        <ul className="lm-key" aria-label="Key">
          {legend.map((l) =>
            item(
              l.cat === NONE_CAT ? undefined : `lm-cat-${l.cat}`,
              l.cat === NONE_CAT,
              catPath(l.cat, 8, 8),
              `${l.label} (${l.n})`,
            ),
          )}
        </ul>
        <p className="lm-key-note">
          In this colouring every mark is a disc, so colour is the only cue. The filters above pick
          out papers by technique or topic.
        </p>
      </>
    );
  return (
    <ul className="lm-key" aria-label="Key">
      {Object.keys(IE_TAGS).map((f) => item(`field-${f}`, false, markPath(f, 8, 8), shortLabel(f)))}
      {item(undefined, true, markPath(undefined, 8, 8), MODE_NONE.ie)}
    </ul>
  );
}

/** What colours the points: a segmented control of radio buttons, so the arrow keys move
 * between the choices and a screen reader names the group. */
export function ModePicker({
  mode,
  modes,
  onChange,
}: {
  mode: Mode;
  modes: readonly Mode[];
  onChange: (m: Mode) => void;
}) {
  return (
    <fieldset className="lm-modes">
      <legend>Colour by</legend>
      {modes.map((m) => (
        <label key={m}>
          <input type="radio" name="lm-mode" checked={mode === m} onChange={() => onChange(m)} />
          <span>{MODE_LABELS[m]}</span>
        </label>
      ))}
    </fieldset>
  );
}

type Via = "mouse" | "touch" | "key";

/** A mark's link name: title, year and first IE field, as the list would read it. */
const paperTitle = (e: LitEntry | undefined, id: string) =>
  e ? `${e.title} (${e.year}), ${e.ie[0] ? tagLabel("ie", e.ie[0]) : "no IE field"}` : id;

/** One press of a zoom button or key. */
const STEP = 1.6;
const TWEEN_MS = 280;
/** Room round a cluster's points when zooming to it, in plate units (hull and name). */
const CLUSTER_PAD = 32;
/** Paper titles show from this zoom on, cut to TITLE_CHARS. */
const TITLES_FROM = 2;
const TITLE_CHARS = 34;
/** Rough width of one title character at the label's 11px, in px. */
const CHAR_PX = 5.5;
/** A mark's size in plate units, for keeping titles off other marks. */
const MARK = 11;
/** The zoom buttons' box over the plate's top right corner, in px, with a little room. */
const ZOOM_BAR = [150, 36] as const;
/** Screen pixels per plate unit that the marks' sizes are drawn for. */
const MARK_PX_PER_UNIT = 0.8;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const clip = (t: string) =>
  t.length > TITLE_CHARS ? `${t.slice(0, TITLE_CHARS - 1).trimEnd()}…` : t;

/** The interactive map on /literature/. One tab stop: arrow keys move to the nearest paper in
 * that direction (panning to keep it in view), Enter opens it in the list, plus and minus zoom,
 * 0 shows the whole map, Escape closes the card and then leaves. A mouse shows a paper's card on
 * hover and opens it on click; on touch the first tap shows the card and a second tap on the
 * same paper opens it, as on Fig. 1. Only the papers the filters keep respond; the rest stay
 * faded.
 *
 * Zoom works on the SVG's viewBox, and the marks and names keep their screen size, so zooming
 * spreads a crowded cluster. The wheel zooms only with Ctrl or Cmd held or once the map has
 * focus, so it never takes over page scrolling; a drag pans, two fingers pinch and pan, and a
 * cluster's name (a chip under the plate on a phone) zooms to that cluster. From TITLES_FROM
 * the papers in view are labelled with their titles where the labels fit. */
export function MapView({
  w,
  h,
  clusters,
  points,
  byId,
  kept,
  catOf,
  onOpen,
  onLeave,
  linked = false,
}: {
  w: number;
  h: number;
  clusters: readonly MapCluster[];
  points: readonly MapPoint[];
  byId: ReadonlyMap<string, LitEntry>;
  kept: ReadonlySet<string>;
  catOf?: (id: string) => number;
  onOpen: (id: string) => void;
  onLeave: () => void;
  /** Before hydration: each mark links to its entry, so the map works without JavaScript. */
  linked?: boolean;
}) {
  const [active, setActive] = useState<MapPoint | null>(null);
  const [via, setVia] = useState<Via>("key");
  // What the live region says after an arrow key that found no paper that way.
  const [edge, setEdge] = useState("");
  // The frame in px once measured; until then it is taken to have the plate's shape.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const base = useMemo(() => baseView(w, h, size ? size.w / size.h : w / h), [w, h, size]);
  const [view, setViewState] = useState<View>(base);
  // The view as last set, for handlers and the tween that run between renders.
  const viewRef = useRef(view);
  const baseRef = useRef(base);
  baseRef.current = base;
  const tween = useRef(0);
  const pointer = useRef<Via | null>(null);
  const svgBox = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const live = points.filter((p) => kept.has(p.id));
  const out = new Set(points.filter((p) => !kept.has(p.id)).map((p) => p.id));
  const zoom = zoomOf(view, base);
  // With a filter on, a cluster's name gives the papers it keeps, as the count above does.
  const shownIn = (c: number, n: number) => (out.size ? live.filter((p) => p.c === c).length : n);
  // Plate units per screen pixel.
  const unit = view.w / (size?.w ?? w);

  const setView = (v: View) => {
    viewRef.current = v;
    setViewState(v);
  };
  /** Set the view at once, as a drag, pinch or wheel does. */
  const jump = (v: View) => {
    cancelAnimationFrame(tween.current);
    setView(v);
  };
  /** Glide to a view, as the buttons, keys and cluster names do; at once under reduced motion. */
  const go = (to: View) => {
    cancelAnimationFrame(tween.current);
    if (reducedMotion()) return setView(to);
    const from = viewRef.current;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min((t - t0) / TWEEN_MS, 1);
      const e = 1 - (1 - k) ** 3;
      const at = (a: number, b: number) => a + (b - a) * e;
      setView({
        x: at(from.x, to.x),
        y: at(from.y, to.y),
        w: at(from.w, to.w),
        h: at(from.h, to.h),
      });
      if (k < 1) tween.current = requestAnimationFrame(tick);
    };
    tween.current = requestAnimationFrame(tick);
  };
  const zoomBy = (f: number) => {
    const v = viewRef.current;
    const c = active && kept.has(active.id) ? active : { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    go(zoomAt(v, f, c.x, c.y, base));
  };
  const boxes = useMemo(
    () =>
      clusters.map((_, c) => {
        const m = points.filter((p) => p.c === c);
        const xs = m.map((p) => p.x);
        const ys = m.map((p) => p.y);
        return {
          x0: Math.min(...xs),
          y0: Math.min(...ys),
          x1: Math.max(...xs),
          y1: Math.max(...ys),
        };
      }),
    [clusters, points],
  );
  const toCluster = (c: number) => go(fitView(boxes[c], base, CLUSTER_PAD));

  // A filter change that leaves the open paper out closes its card.
  useEffect(() => {
    if (active && !kept.has(active.id)) setActive(null);
  }, [active, kept]);

  // The frame's size sets the view's shape; a new size starts again from the whole map.
  useEffect(() => {
    const el = svgBox.current;
    if (linked || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height)
        setSize((s) =>
          s && s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height },
        );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [linked]);
  useEffect(() => {
    cancelAnimationFrame(tween.current);
    viewRef.current = base;
    setViewState(base);
  }, [base]);
  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  // The wheel zooms about the pointer, but only with Ctrl or Cmd (a trackpad pinch sends Ctrl)
  // or while the map has focus. React's wheel listener is passive, so this one is added here.
  useEffect(() => {
    const el = svgBox.current;
    if (linked || !el) return;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || document.activeElement === el)) return;
      e.preventDefault();
      const v = viewRef.current;
      const [px, py] = toPlate(v, el.getBoundingClientRect(), e.clientX, e.clientY);
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      cancelAnimationFrame(tween.current);
      viewRef.current = zoomAt(v, Math.exp(-dy * 0.002), px, py, baseRef.current);
      setViewState(viewRef.current);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [linked]);

  // Escape anywhere closes the card, which a pointer may be resting on (WCAG 1.4.13).
  useEffect(() => {
    if (!active) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [active]);

  // After a tap the card docks under the plate on a phone: bring it into view.
  useEffect(() => {
    if (via === "touch" && active)
      cardRef.current?.scrollIntoView?.({
        block: "nearest",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
  }, [active, via]);

  const show = (p: MapPoint | null, how: Via) => {
    setActive(p);
    setVia(how);
    setEdge("");
  };
  // The kept paper within 20 screen pixels of the pointer.
  const at = (e: { clientX: number; clientY: number }) => {
    const r = svgBox.current?.getBoundingClientRect();
    if (!r?.width) return null;
    const v = viewRef.current;
    const [x, y] = toPlate(v, r, e.clientX, e.clientY);
    return nearest(live, x, y, (20 * v.w) / r.width);
  };
  // Two fingers moved from (a, b) to (c, d): zoom by the change in their spread about their
  // midpoint, and pan with it.
  const pinch = (a: Pt, b: Pt, c: Pt, d: Pt, r: DOMRect) => {
    const v = viewRef.current;
    const f = Math.hypot(c.x - d.x, c.y - d.y) / (Math.hypot(a.x - b.x, a.y - b.y) || 1);
    const [px, py] = toPlate(v, r, (a.x + b.x) / 2, (a.y + b.y) / 2);
    const z = zoomAt(v, f, px, py, base);
    const k = z.w / r.width;
    jump(panBy(z, -((c.x + d.x - a.x - b.x) / 2) * k, -((c.y + d.y - a.y - b.y) / 2) * k, base));
  };

  const entry = active ? byId.get(active.id) : undefined;
  const cluster = active ? clusters[active.c] : undefined;
  const hint = {
    mouse: "Click to open it in the list.",
    touch: "Tap it again to open it in the list.",
    key: "Enter opens it in the list. Escape closes the card, and again leaves the map.",
  }[via];
  // Where a plate point sits in the frame, as fractions of its width and height.
  const fx = (x: number) => (x - view.x) / view.w;
  const fy = (y: number) => (y - view.y) / view.h;
  const inside = (x: number, y: number) => fx(x) >= 0 && fx(x) <= 1 && fy(y) >= 0 && fy(y) <= 1;
  // A cluster name kept whole inside the frame (its width estimated) once the frame is measured.
  const nameLeft = (k: MapCluster) => {
    if (!size) return `${fx(k.lx) * 100}%`;
    const half = nameWidthPx(k) / 2;
    return `${Math.min(Math.max(fx(k.lx) * size.w, half), size.w - half)}px`;
  };

  // Titles for the kept papers in view, the focused one first, then top to bottom, each to
  // the right of its mark where it covers no other label or mark.
  let titles: { id: string; text: string; x: number; y: number; w: number; h: number }[] = [];
  if (size && zoom >= TITLES_FROM) {
    const sx = (x: number) => fx(x) * size.w;
    const sy = (y: number) => fy(y) * size.h;
    const shown = live.filter((p) => inside(p.x, p.y));
    const m = MARK * MARK_PX_PER_UNIT;
    const marks = shown.map((p) => ({
      id: p.id,
      x: sx(p.x) - m / 2,
      y: sy(p.y) - m / 2,
      w: m,
      h: m,
    }));
    const order = [...shown].sort(
      (a, b) => Number(b.id === active?.id) - Number(a.id === active?.id) || a.y - b.y,
    );
    titles = placeLabels(
      order.map((p) => {
        const text = clip(byId.get(p.id)?.title ?? p.id);
        return {
          id: p.id,
          text,
          x: sx(p.x) + m / 2 + 3,
          y: sy(p.y) - 7,
          w: text.length * CHAR_PX + 4,
          h: 14,
        };
      }),
      size,
      // The zoom buttons sit over the top right corner on a wide screen.
      [...marks, { id: "", x: size.w - ZOOM_BAR[0], y: 0, w: ZOOM_BAR[0], h: ZOOM_BAR[1] }],
      (l, o) => l.id === o.id,
    );
  }

  // One tab stop for a 2D widget that reads arrow keys; the list below is the screen-reader
  // path. Before hydration the marks are links and the frame is a plain box.
  const frameA11y = linked
    ? {}
    : {
        role: "application",
        tabIndex: 0,
        "aria-label": `Map of the literature, ${live.length} papers. Arrow keys move between papers, Enter opens one in the list, plus and minus zoom, 0 shows the whole map. Escape closes the card, then leaves the map.`,
      };

  return (
    <div className="lm-view">
      <div className="lm-stage">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: frameA11y makes it an application once hydrated; the handlers never run before that */}
        <div
          ref={svgBox}
          className="lm-frame"
          style={{ aspectRatio: `${w} / ${h}` }}
          data-zoomed={zoom > 1.001 || undefined}
          {...frameA11y}
          onPointerDown={(e) => {
            pointer.current = e.pointerType === "mouse" ? "mouse" : "touch";
            if (e.pointerType !== "mouse")
              touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (e.pointerType === "mouse" ? e.button === 0 : touches.current.size === 1)
              drag.current = { x: e.clientX, y: e.clientY, moved: false };
            // A mouse drag keeps reaching the frame when it passes over the card.
            if (e.pointerType === "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const r = svgBox.current?.getBoundingClientRect();
            const t = touches.current;
            const g = drag.current;
            if (t.has(e.pointerId)) {
              const before = [...t.values()];
              t.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (t.size >= 2 && r?.width) {
                const [c, d] = [...t.values()];
                pinch(before[0], before[1], c, d, r);
                if (g) g.moved = true;
                return;
              }
            }
            const pressed = e.pointerType === "mouse" ? e.buttons % 2 === 1 : zoom > 1.001;
            if (g && pressed && r?.width) {
              const dx = e.clientX - g.x;
              const dy = e.clientY - g.y;
              if (g.moved || Math.hypot(dx, dy) > 4) {
                if (!g.moved) setActive(null);
                g.moved = true;
                [g.x, g.y] = [e.clientX, e.clientY];
                const k = viewRef.current.w / r.width;
                jump(panBy(viewRef.current, -dx * k, -dy * k, base));
                return;
              }
            }
            if (e.pointerType === "mouse") show(at(e), "mouse");
          }}
          onPointerUp={(e) => touches.current.delete(e.pointerId)}
          onPointerCancel={(e) => {
            touches.current.delete(e.pointerId);
            drag.current = null;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return;
            drag.current = null;
            // Onto the card: it stays, so the pointer can rest on it.
            if (
              via === "mouse" &&
              !(e.relatedTarget instanceof Node && cardRef.current?.contains(e.relatedTarget))
            )
              setActive(null);
          }}
          onClick={(e) => {
            const how = pointer.current ?? "mouse";
            pointer.current = null;
            const dragged = drag.current?.moved;
            drag.current = null;
            if (dragged) return;
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
              const next = from ? step(live, from, e.key) : first(live);
              const p = next ?? from;
              show(p, "key");
              if (from && !next) setEdge(`No paper further ${e.key.slice(5).toLowerCase()}.`);
              if (p) go(keepInView(viewRef.current, p.x, p.y, 24 * unit, base));
            } else if (e.key === "Enter" && active) {
              e.preventDefault();
              onOpen(active.id);
            } else if (e.key === "+" || e.key === "=") {
              e.preventDefault();
              zoomBy(STEP);
            } else if (e.key === "-" || e.key === "_") {
              e.preventDefault();
              zoomBy(1 / STEP);
            } else if (e.key === "0") {
              e.preventDefault();
              go(base);
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
            catOf={catOf}
            out={out}
            active={active}
            href={linked ? (id) => `#${id}` : undefined}
            title={linked ? (id) => paperTitle(byId.get(id), id) : undefined}
            view={linked ? undefined : view}
            zoom={size ? (zoom * size.w) / base.w / MARK_PX_PER_UNIT : 1}
            labels={linked}
          />
        </div>
        {!linked && (
          <>
            <div className="lm-over">
              {titles.map((t) => (
                <span
                  key={t.id}
                  className="lm-title"
                  aria-hidden="true"
                  style={{ left: `${t.x}px`, top: `${t.y}px` }}
                >
                  {t.text}
                </span>
              ))}
              {clusters.map(
                (k, c) =>
                  inside(k.lx, k.ly) && (
                    <button
                      type="button"
                      key={k.name}
                      className="lm-name"
                      style={{ left: nameLeft(k), top: `${fy(k.ly) * 100}%` }}
                      onClick={() => toCluster(c)}
                    >
                      <span className="sr-only">Zoom to </span>
                      {k.name} <span className="lm-n">{shownIn(c, k.n)}</span>
                    </button>
                  ),
              )}
            </div>
            <fieldset className="lm-zoom" aria-label="Zoom">
              <button
                type="button"
                aria-label="Zoom in"
                aria-disabled={zoom >= ZOOM_MAX - 0.01 || undefined}
                onClick={() => zoomBy(STEP)}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M3 8h10M8 3v10" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                aria-disabled={zoom <= 1.001 || undefined}
                onClick={() => zoomBy(1 / STEP)}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M3 8h10" />
                </svg>
              </button>
              <button
                type="button"
                className="lm-reset"
                aria-disabled={zoom <= 1.001 || undefined}
                onClick={() => go(base)}
              >
                Full map
              </button>
              {/* On a phone, where the plate's names give way, the clusters are chips here. */}
              {clusters.map((k, c) => (
                <button type="button" key={k.name} className="lm-chip" onClick={() => toCluster(c)}>
                  <span className="sr-only">Zoom to </span>
                  {k.name} <span className="lm-n">{shownIn(c, k.n)}</span>
                </button>
              ))}
            </fieldset>
          </>
        )}
        {entry && active && (
          <div
            ref={cardRef}
            className="lm-card"
            data-flip-x={fx(active.x) > 0.55 || undefined}
            data-flip-y={fy(active.y) > 0.55 || undefined}
            style={{ left: `${fx(active.x) * 100}%`, top: `${fy(active.y) * 100}%` }}
            onPointerLeave={(e) => {
              if (
                e.pointerType === "mouse" &&
                via === "mouse" &&
                !(e.relatedTarget instanceof Node && svgBox.current?.contains(e.relatedTarget))
              )
                setActive(null);
            }}
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
      <span className="sr-only" aria-live="polite">
        {edge ||
          (via === "key" && entry
            ? `${entry.title}, ${entry.year}${cluster ? `, ${cluster.name}` : ""}`
            : "")}
      </span>
    </div>
  );
}

type Pt = { x: number; y: number };
