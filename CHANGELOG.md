# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- An RSS feed of new literature entries at `/literature/feed.xml`, linked from the Literature page.
- BibTeX and RIS export on the literature page, for one entry or for the filtered view. The
  records come from Crossref and arXiv, cleaned and cached in `src/data/citations.json` by
  `pnpm run citations`. An entry with no cached record yet exports a short one built from its
  YAML fields.
- Search can also match the reading list by meaning: ask in plain words, like "which papers
  sort waste with cameras?", in the search dialog. The papers are embedded when the site is
  built; the site's `/api/embed` endpoint on Cloudflare Workers AI embeds the question.
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
