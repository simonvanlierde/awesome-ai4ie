import { useState } from "react";
import type { AppEntry } from "../data/schemas";
import { DIM_LABELS, SHORT_LABELS, tagLabel } from "../data/tags";
import { litUrl, siteUrl } from "../lib/urls";
import { groupBy, toGrid } from "./appPivot";
import TagChips from "./TagChips";

type Mode = "ie" | "ml" | "grid";

const MODES: { key: Mode; label: string }[] = [
  { key: "ie", label: `By ${DIM_LABELS.ie}` },
  { key: "ml", label: `By ${DIM_LABELS.ml}` },
  { key: "grid", label: "Grid" },
];

/**
 * Pivotable view of applications.yaml: the same entries grouped by IE field,
 * by AI technique, or as an IE × ML grid. Entries and cells deep-link to the
 * literature list, by cited paper ids where an entry cites papers, by the
 * same tags otherwise.
 *
 * The mode switch is a group of toggle buttons (aria-pressed), not tabs: the
 * content below re-renders in place rather than showing one of several panels.
 */
export default function ApplicationsExplorer({ entries }: { entries: AppEntry[] }) {
  const [mode, setMode] = useState<Mode>("ie");

  return (
    <div className="apx not-content">
      <fieldset className="apx-switch" aria-label="Map view">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.key}
            aria-pressed={mode === m.key}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </fieldset>

      {mode !== "grid" && (
        <div>
          {[...groupBy(entries, mode)].map(([tag, apps]) => (
            <section key={tag} className="apx-group">
              <h3 className={`apx-group-label${mode === "ie" ? ` apx-ie field-${tag}` : ""}`}>
                {tagLabel(mode, tag)}
              </h3>
              <ul className="apx-list">
                {apps.map((a) => (
                  <li key={a.id} className="apx-entry">
                    <span className="apx-name">{a.name}</span>
                    <p className="apx-summary">
                      {a.summary} <em className="apx-maturity">{a.maturity}</em>
                    </p>
                    <span className="apx-links">
                      <TagChips ie={a.ie} ml={a.ml} />
                      <a
                        href={
                          a.papers.length > 0
                            ? litUrl({ papers: a.papers })
                            : litUrl({ ie: a.ie, ml: a.ml })
                        }
                      >
                        {a.papers.length > 0
                          ? `papers (${a.papers.length}) →`
                          : "related reading →"}
                      </a>
                      {a.demo && <a href={siteUrl(a.demo)}>demo →</a>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {mode === "grid" && <Grid entries={entries} />}
    </div>
  );
}

/**
 * AI technique as rows, IE field as columns: there are far more techniques than
 * fields, so this reads as a tall table rather than a wide one. `toGrid` keeps
 * its IE × ML contract and keys cells "ie|ml"; only the presentation transposes.
 * `toGrid` already returns both axes in vocabulary order.
 */
function Grid({ entries }: { entries: AppEntry[] }) {
  const { rows: ies, cols: mls, cells } = toGrid(entries);

  return (
    // A focusable, named region: on a phone the table scrolls sideways inside it.
    <section
      className="apx-grid-wrap"
      aria-labelledby="apx-grid-title"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-reachable (WCAG 2.1.1)
      tabIndex={0}
    >
      <p className="apx-grid-title" id="apx-grid-title">
        <b>Table 1.1</b>Applications by AI technique and IE field
      </p>
      <table className="apx-grid" aria-labelledby="apx-grid-title">
        <thead>
          <tr>
            <th aria-label="AI technique by IE field" />
            {ies.map((ie) => (
              <th key={ie} scope="col" className={`field-${ie}`}>
                <a href={litUrl({ ie: [ie] })}>
                  <span className="apx-head-full">{tagLabel("ie", ie)}</span>
                  <span className="apx-head-short" aria-hidden="true">
                    {SHORT_LABELS[ie as keyof typeof SHORT_LABELS] ?? ie}
                  </span>
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mls.map((ml) => (
            <tr key={ml}>
              <th scope="row">
                <a href={litUrl({ ml: [ml] })}>{tagLabel("ml", ml)}</a>
              </th>
              {ies.map((ie) => {
                const apps = cells.get(`${ie}|${ml}`);
                if (!apps)
                  return (
                    <td key={ie} data-n="0">
                      <span className="sr-only">
                        No application yet: {tagLabel("ie", ie)} with {tagLabel("ml", ml)}
                      </span>
                    </td>
                  );
                const papers = [...new Set(apps.flatMap((a) => a.papers))];
                const names = apps.map((a) => a.name).join(" · ");
                // The visible text is only a count, so the accessible name carries the apps.
                const name = `${apps.length} ${apps.length === 1 ? "application" : "applications"}: ${names}`;
                // Shade steps at 1, 2 and 3+ applications.
                return (
                  <td key={ie} data-n={Math.min(apps.length, 3)}>
                    {papers.length > 0 ? (
                      <a href={litUrl({ papers })} title={names} aria-label={`Papers for ${name}`}>
                        {apps.length}
                      </a>
                    ) : (
                      <span title={names}>
                        <span aria-hidden="true">{apps.length}</span>
                        <span className="sr-only">{name}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="apx-grid-src">
        Shade = number of applications: 1, 2, or 3 and more; a dashed cell has none yet. Source:
        src/data/applications.yaml.
      </p>
    </section>
  );
}
