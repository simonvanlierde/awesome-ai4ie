import type { AppEntry } from "../data/schemas";
import { litUrl, siteUrl } from "../lib/urls";
import TagChips from "./TagChips";

/**
 * A list of applications, each a native disclosure. Closed, an entry shows its
 * name and maturity call: what a reader scans for. The description, tags and
 * links open on demand. Static markup with no state, so it renders without
 * JavaScript on the map's field sections and inside the explorer island.
 */
export default function AppList({ apps }: { apps: readonly AppEntry[] }) {
  return (
    <ul className="apx-list">
      {apps.map((a) => (
        <li key={a.id} className="apx-entry">
          <details>
            <summary>
              <span className="apx-name">{a.name}</span>
              <span className="apx-maturity">{a.maturity}</span>
            </summary>
            <p className="apx-summary">{a.summary}</p>
            <span className="apx-links">
              <TagChips ie={a.ie} ml={a.ml} />
              <a
                href={
                  a.papers.length > 0
                    ? litUrl({ papers: a.papers })
                    : litUrl({ ie: a.ie, ml: a.ml })
                }
              >
                {a.papers.length > 0 ? `papers (${a.papers.length}) →` : "related reading →"}
              </a>
              {a.demo && <a href={siteUrl(a.demo)}>demo →</a>}
            </span>
          </details>
        </li>
      ))}
    </ul>
  );
}
