# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `pnpm run cited-figures` lists every number the site attributes to a paper. With
  `--notes <dir>` it lists only the numbers no reading note records yet.
- A Verify AI-assisted work page: the coding and ML reproducibility checklists, golden
  tests kept out of an agent's reach, scoring an AI step on known answers, a claim ledger,
  a run log, and short tips for working with a coding agent (`AGENTS.md`, a plan first, one
  git worktree per agent, hooks). `/best-practices/checklists/`, `/agentic-harnesses/` and
  `/evals/` redirect to it.
- Getting started & pitfalls opens with "How reliable is AI today?", a table of the two
  benchmarks that test language models on IE tasks.
- The verification checklist gains items on a test seen failing, reading the agent's plan,
  a full test run after the last edit, a run log, and scoring an AI step on known answers.
- A Courses, videos & posts page under Tools & courses.
- The home page says who the site is for and where to start: your field on the map, or
  Getting started if you're new to machine learning. The footer links to the governance
  document.
- A Details panel for each paper on the literature page: both the DOI and arXiv links,
  field pages and filtered views for its tags, the applications that cite it, three
  similar papers by meaning, a copyable link and an edit form. `/literature/#<id>` opens
  that paper's panel, and citations, field pages, search results and the MCP tools now
  link papers that way.
- A tag vocabulary page at `/vocabulary/`: each IE field, topic, AI technique and entry type
  with its definition, source and Wikidata or OpenAlex matches, and an anchor per tag. The
  vocabulary is also published as SKOS at `/vocabulary.ttl` and `/vocabulary.jsonld`. Old
  literature links with a retired tag, such as `?ie=mfa`, show its replacement.
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
  read-only, return absolute links, and answer errors with a stable code. Every tool but
  `get_skill` declares an output schema, the list tools filter by id, each application links
  to its place on the map, and retired tag ids map to their replacements.
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

- Plainer copy across the site: ML terms are explained where a reader first meets them,
  long sentences are split, and each field page's intro no longer repeats the maturity
  calls listed below it.
- The literature page holds only papers and the MCP server. Courses, videos and posts
  moved to Tools & courses, and related communities to the Contribute page. The chapters
  are now "Literature" and "Tools & courses".
- The computer vision taxonomy moved from the map to Demos, at `/demos/cv-taxonomy/`
  (the old URL redirects).
- The map page lists the fields before the technique grid, hides the thin-topics list when
  it is empty, and no longer lists matching or knowledge graphs as untried: symbiosis
  papers use them under other tags.
- Maturity calls name their source and drop claims the cited papers don't make: the
  carbon-footprinting error figures are Flamingo's, impact screening and night-light
  stock mapping say what the studies show, and robotic disassembly rests on one preprint.
- The Contribute page says the site is a proposal and the norms poll a
  straw poll, not a group decision.
- Each IE field's evidence summary moved from the map page to the field's own page, and
  the map page lists the fields instead of repeating their applications. Old anchors such
  as `/applications-map/#life-cycle-assessment` still land on the field list.
- "Suggest a paper", "Suggest a correction", "Suggest an edit" and similar links open the
  on-site contribution form, with the type and title filled in, instead of a GitHub issue
  form. The form reads `?type=`, `?title=` and `?details=`.
- Fig. 1 spreads the shorter column over the full height, so both sides of the flow line up.
- The home page text runs wider on desktop, and a short opening line no longer leaves a
  large gap above the first heading.
- The colophon (licences and page links) sits below the previous and next page links, in
  larger text.
- An `@name` in a form submission no longer notifies that GitHub account from the public
  issue, and the 404 page's report link fills in the missing address and the linking page.
- Git hooks run with prek in place of lefthook.
- Commit messages and pull request titles follow `type(scope): summary`, checked by a
  commit-msg hook and the pr-title workflow.

### Fixed

- The LLM inventory-extraction scores (0.82 and 0.86) are BERTScore F1, which scores
  wording, not values or units. The applications map, the paper's blurb and the
  application line had called them plain F1.
- The laptop-segmentation figure (98.8% mAP50) is from a 56-image test set drawn from 560
  photos, not "a benchmark of 1,456 annotated images", which counted augmented copies.
- The Austria and Germany stock-map blurb said "no cadastre needed". The method avoids
  cadastral data as input, but its building heights were trained on cadaster data.

[Unreleased]: https://github.com/simonvanlierde/awesome-ai4ie/commits/HEAD
