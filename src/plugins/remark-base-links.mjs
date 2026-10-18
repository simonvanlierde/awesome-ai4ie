/**
 * Prefix root-absolute Markdown links with the site's `base`.
 *
 * Astro applies `base` to its own routes but not to hrefs written in Markdown,
 * so content cannot simply say `/tools/`. Relative links (`../tools/`) work
 * only while the page is served with a trailing slash: open `/awesome-ai4ie`
 * without one and every link on the page breaks. Root-absolute links rewritten
 * here work at any depth, with or without the slash.
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
