// Starlight's search button is labelled "Search" with a "Ctrl K" hint that
// aria-keyshortcuts conveys. Upstream closed it as intended (the hint is a
// symbolic supplement, not a label): https://github.com/withastro/starlight/issues/4260
// An axe `exclude` would skip every rule, so drop only this rule's node.
export const STARLIGHT_SEARCH = 'button[data-open-modal=""]';
export function withoutSearchHint(violations) {
  return violations
    .map((v) => ({
      ...v,
      nodes: v.nodes.filter(
        (n) => v.id !== "label-content-name-mismatch" || n.target.join(" ") !== STARLIGHT_SEARCH,
      ),
    }))
    .filter((v) => v.nodes.length > 0);
}
