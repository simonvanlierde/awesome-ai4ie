/**
 * Prefix root-absolute Markdown links with the site's `base`.
 *
 * Astro applies `base` to its own routing but not to hrefs written by hand in
 * Markdown, so content can't portably say `/tools/`. Relative links (`../tools/`)
 * do resolve, but only while the containing page is served with a trailing
 * slash — one `/awesome-ai4ie` without it and every link on the page breaks.
 * Writing links root-absolute and rewriting them here is depth- and
 * trailing-slash-independent.
 *
 * Links to files in the GitHub repo are written `repo:blob/main/CONTRIBUTING.md`
 * and become `${repoUrl}/blob/main/CONTRIBUTING.md`, so the repo URL lives only
 * in astro.config.mjs.
 */
const TRAILING_SLASH = /\/$/;

export function remarkBaseLinks({ base, repoUrl }) {
  const prefix = base.replace(TRAILING_SLASH, "");
  const withBase = (url) => (url === prefix || url.startsWith(`${prefix}/`) ? url : prefix + url); // idempotent

  // Only Markdown body links; frontmatter (e.g. Starlight hero actions) is read
  // straight from the collection and must spell out the base itself.
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== "link") return;
      if (node.url.startsWith("/")) node.url = withBase(node.url);
      else if (node.url.startsWith("repo:")) node.url = `${repoUrl}/${node.url.slice(5)}`;
    });
  };
}

// NOTE: 4-line walker instead of a `unist-util-visit` dependency; the rehype plugin uses it too.
export function visit(node, fn) {
  fn(node);
  for (const child of node.children ?? []) visit(child, fn);
}
