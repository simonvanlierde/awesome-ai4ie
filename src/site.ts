// Where the site and its repo live: the one place to change when the repo moves
// or a custom domain goes live. astro.config.mjs, the components and
// scripts/a11y.mjs all read it. MAINTAINING.md lists what else to redo by hand.

export const owner = "simonvanlierde";
export const repo = "awesome-ai4ie";

/** Custom domain without `https://`, such as "ai4ie.org". Empty serves the site
 * from `<owner>.github.io/<repo>/`. Set it in the same step as the Pages custom
 * domain setting (MAINTAINING.md): the site then moves to the domain's root. */
export const domain = "ai4ie.org";

export const repoUrl = `https://github.com/${owner}/${repo}`;
export const site = domain ? `https://${domain}` : `https://${owner}.github.io`;
/** The path the site is served under, without a trailing slash: "" at a domain's root. */
export const basePath = domain ? "" : `/${repo}`;
