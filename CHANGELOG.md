# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A Details panel for each paper on the literature page: both the DOI and arXiv links,
  field pages and filtered views for its tags, the applications that cite it, three
  similar papers by meaning, a copyable link and an edit form. `/literature/#<id>` opens
  that paper's panel, and citations, field pages, search results and the MCP tools now
  link papers that way.
- Resources in `src/data/resources.yaml`: the tools, datasets and models from the tools
  pages, plus 14 courses, videos, posts and communities proposed for review. The tools pages
  and the literature page list them with a `Resources` component, which explainer sections
  also use to link a course or a video. A new issue form suggests a course, video, post or
  community.
- Example uses for each Agent Skill on the prompts-and-skills page.
- The IE fields now follow the [ISIE sections](https://is4ie.org/sections): life cycle
  assessment, socio-economic metabolism, input-output, circular economy and industrial
  symbiosis. They replace MFA, waste & EoL and urban mining, and the input-output topic
  became a field. Sustainable urban systems is listed as a gap on the map.
- A page per IE field under `/applications-map/<field>/`: what the field is, each AI technique
  used there with its applications, maturity calls, demos and papers, and the field's gaps.
  The pages render from the data files, and the map links each field section to its page.
- Each URL in the sitemap carries a `<lastmod>` date: the last commit to the page, or to the
  data files it renders, if that is later.
- A `robots.txt` that names the sitemap, lets search and answer engines index the site, and asks
  AI training crawlers to stay away (`Content-Signal: search=yes, ai-input=yes, ai-train=no`).
- An RSS feed of new literature entries at `/literature/feed.xml`, linked from the Literature page.
- BibTeX and RIS export on the literature page, for one entry or for the filtered view. The
  records come from Crossref and arXiv, cleaned and cached in `src/data/citations.json` by
  `pnpm run citations`. An entry with no cached record yet exports a short one built from its
  YAML fields.
- Search can also match the reading list by meaning: ask in plain words, like "which papers
  sort waste with cameras?", in the search dialog. The papers are embedded when the site is
  built; the site's `/api/search` endpoint embeds the question with Cloudflare Workers AI and
  ranks the papers. Where the host has no `/api/search`, the dialog leaves meaning search out.
- A read-only MCP server at `/mcp` on the Worker, so AI assistants can search the reading list
  and read papers, applications, resources and the Agent Skills. Its tools are marked
  read-only, return absolute links, and answer errors with a stable code.
- A privacy page at `/privacy/`, linked from the footer: what the site sends where, including
  the questions meaning search sends to Cloudflare.
- An accessibility statement at `/accessibility/`, linked from the footer.
- A Content-Security-Policy `<meta>` tag on every page, and `/.well-known/security.txt`.
- Weekly OpenSSF Scorecard and advisory audits, a cold-install check of the README's
  development commands, and a dependency licence check (`pnpm run licenses`) in CI.
- A code of conduct, a security policy, and the test and coding-standard rules in
  CONTRIBUTING.md.
- An architecture description in the README.
- CITATION.cff, codemeta.json and .zenodo.json, kept in agreement by the citesync hook,
  so GitHub shows "Cite this repository".
- A page-weight budget (`pnpm run page-weight`): CI fails when a built page's first-visit
  transfer goes over its budget.

### Changed

- Git hooks run with prek in place of lefthook.
- Commit messages and pull request titles follow `type(scope): summary`, checked by a
  commit-msg hook and the pr-title workflow.

[Unreleased]: https://github.com/simonvanlierde/awesome-ai4ie/commits/HEAD
