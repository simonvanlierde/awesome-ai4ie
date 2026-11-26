# Contributing

## The short version

[Suggest a paper](../../issues/new?template=paper.yml),
[map an application](../../issues/new?template=application.yml),
[suggest a tool](../../issues/new?template=tool.yml),
[suggest a course, video or post](../../issues/new?template=resource.yml) or
[pick another suggestion form](../../issues/new?template=other.yml). A maintainer reviews
the suggestion. The forms need a GitHub account; without one, use the
[contribution form on the site](https://ai4ie.org/contribute/). You can also post in the
[AI4IE Discord](https://discord.gg/zhHAZakXHX).

To make the change yourself:

1. Copy a nearby entry in [`literature.yaml`](src/data/literature.yaml),
   [`applications.yaml`](src/data/applications.yaml) or [`resources.yaml`](src/data/resources.yaml).
   For page copy, edit the Markdown under `src/content/docs/`.
2. Open a pull request. Use a Conventional Commit title such as
   `feat(literature): add Smith 2025`. One entry per pull request is enough.

Edit the file on GitHub or follow **Edit page** on the site. To run the site locally, see
the [development section](README.md#development).

### Adding a paper, an application or a resource

An AI-in-IE paper belongs in the reading list when all four hold:

1. **An AI or ML method is central:** it is built, trained, compared or evaluated. Bayesian and probabilistic inference count, and so do knowledge graphs, NLP, remote sensing or image analysis that maps stocks, and datasets made to train or test such models. Descriptive statistics, fixed thresholds, deterministic balancing (RAS, Leontief projections) and a passing mention of "AI" don't.
2. **The question is industrial ecology,** framed as such by the paper itself: LCA, socio-economic metabolism (material flows and stocks), input-output analysis, the circular economy (waste, end of life, secondary resources), industrial symbiosis, or the materials, chemicals, food, water, energy and supply risk questions those methods answer.
3. **It is not about the footprint of AI itself.**
4. **It is worth an IE researcher's time:** a research article, review, dataset, framework, or a perspective written for IE researchers. Surveys of firms adopting "AI for the circular economy", and reviews of neighbouring fields that never use an IE method, don't qualify.

When you reject a weekly lead, give the rule it fails as its `why`.

- Tags come from the [tag vocabulary](#the-tag-vocabulary) (IE field · topic · AI technique · entry type). Need a tag that doesn't exist? Add it in the same PR.
- Literature entries need an `id` (the citation key), `title`, `authors`, `year`, a one-line `blurb` saying why it's worth reading, tags, and `added: YYYY-MM`.
- Write `authors` as a list with one `"Surname, I."` per author. Add `etAl: true` when you stop before the last author.
- Give a `doi` (the bare `10.…` id), an `arxiv` id (the bare id, such as `2401.01234`), or both.
- An entry is marked "new" in the list for about two months from the start of its `added` month.
- Resource entries need an `id`, `title`, `url`, a `kind`, a one-line `blurb` saying why it's worth the time, and `checked: YYYY-MM`, the month you last opened the link. A tool also takes `good` and `notFor` (the "Good for" and "Not for" verdict), `cost`, `data` (whether data leaves your machine) and `group` (its list on the tools pages).
- Application entries need both tag dimensions (`ie:` and `ml:`), a `stage:` (`early`: reviews, one study or a prototype; `tested`: several studies or a benchmark, not operational data; `applied`: checked against real-world data at scale, with an independent reference), an honest one-line `maturity:` giving the evidence behind the stage, and `papers:` referencing literature ids.
- `pnpm test` checks every field, tag, and cross-reference. CI runs it on your PR.
- If you work locally, run `pnpm run citations` and include the citation cache with the paper.
  A maintainer can fetch the record for a GitHub-only edit. Until the cache has a record,
  the site exports a short citation from the YAML entry.

### Listing resources on a page

To show resources in a page's prose, such as a video beside an explanation, drop in the
`Resources` component. It lists the entries of one kind, tool group or tag:

```mdx
import Resources from '../../components/Resources.astro';

<Resources kind="video" ml="llm" />
```

`ie="any"` lists entries with an IE tag and `ie="none"` those without one. A filter that
matches no entry fails the build.

### Citing a source in prose

If the source is in the reading list, or should be, use the `Cite` component, not a bare link. It looks up the entry by `id` at build time and links to the reading list filtered to that paper:

```mdx
---
title: Your page
---

import Cite from '../../components/Cite.astro';

Label readability collapses at the recycler <Cite id="sterkensProductLabelIdentification2023" />.
```

That renders `(Sterkens et al., 2023)`, with author and year from `literature.yaml`. A wrong or missing `id` **fails the build**.

When your sentence already names the thing, put the name between the tags:

```mdx
foundation segmenters (<Cite id="kirillovSegmentAnything2023">SAM</Cite>, …)
```

- **A claim with a number in it needs a citation.** If the paper behind it isn't in `literature.yaml` yet, add it in the same PR.
- **Check a number in the paper's body, not its abstract.** Name the metric and the test set behind it. "F1" can be BERTScore F1, which scores wording, not values. An abstract's dataset size can count augmented copies of a much smaller test set.
- **If you can't find the source, don't guess.** Leave the claim uncited and mark it `TODO`.
- `pnpm run cited-figures` lists every number the site attributes to a paper, from the pages, the blurbs and the application lines. With `--notes <dir>`, a folder of reading notes named `@<citekey>.md`, it lists only the numbers no note records yet. Only numbers between a note's `%% begin obsidian notes %%` and `%% end obsidian notes %%` lines count.

## Ground rules

- **No fabricated entries.** Every tool, paper, or number must be real and checkable. If you're not sure, mark it `TODO` and say what needs confirming.
- **Date what goes stale.** Prices, specs, and model names change. Add the month you checked (`YYYY-MM`).
- **Sensitive data:** say whether a tool sends data off-device. It matters for confidential industry data and personal data.
- **Match the existing format** on the page you're editing. Don't restructure a page in a content PR.

## Extending the site

### Adding a page

Create `src/content/docs/your-section.md` with a `title:` in the front matter. Then add it to `sidebar:` in [`astro.config.mjs`](astro.config.mjs):

```js
{ label: 'Your section title', slug: 'your-section' },
```

A page inside an existing chapter needs nothing else. A new top-level entry is a new chapter, and it also needs an entry in [`src/lib/chapters.ts`](src/lib/chapters.ts) and one of the five chapter inks in [`src/styles/custom.css`](src/styles/custom.css) (an `--ink-N` pair and the sidebar's `li:nth-child` rule). All five are in use, so open an issue first. `pnpm test` checks that they agree.

### The tag vocabulary

Every tag is a concept in [`src/data/vocabulary.yaml`](src/data/vocabulary.yaml), and the
[vocabulary page](https://ai4ie.org/vocabulary/) lists them. A concept has these fields:

- `id`: the tag itself, in kebab-case. It is permanent: never reuse one, not even in another
  scheme. The page has an anchor for it, such as `/vocabulary/#lca`.
- `scheme`: `field`, `topic`, `technique` or `type`. In the data files these are the `ie`,
  `topic`, `ml` and `type` lists.
- `prefLabel`: the label that chips, forms and pages show. `short` is the start of it, for
  Fig. 1 on the home page. Every IE field and AI technique needs a `short`.
- `definition`: one line. An IE field gives its ISIE section as `source`.
- `broader` and `related`: ids of other concepts.
- `exactMatch`, `closeMatch`, `broadMatch`, `narrowMatch` and `relatedMatch`: IRIs of
  concepts elsewhere, by how far they are from this one. `exactMatch` is the same concept,
  such as the Wikidata item for life cycle assessment; `closeMatch` is near enough to swap
  in some uses. `broadMatch` is wider: most OpenAlex topics are. `narrowMatch` is part of
  this concept, such as the Wikidata item for one half of "Detection & segmentation". One
  IRI goes under one of them only. Open each IRI before you add it; `pnpm run
  vocabulary-links` prints every link beside the label it points at, and runs weekly in CI.
- `reserved: true`: no entry uses the concept yet. Set it on a concept added before any entry
  uses it, such as a planned facet. `pnpm test` fails once an entry uses it, so remove the flag
  in the same change.

To add a tag:

1. Add the concept to `vocabulary.yaml`, in display order within its scheme: topics go in
   alphabetical order of `prefLabel`, fields and techniques where they fit.
2. Run `pnpm run vocabulary`. It writes `src/data/vocabulary.gen.ts`, the labels the site's
   code imports.
3. Add the `prefLabel` to the matching dropdown in the issue forms in
   [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).
4. For a new topic, add a line to `TOPIC_WANTED` in [`src/data/tags.ts`](src/data/tags.ts)
   that says what work the topic still wants.

`pnpm test` checks the forms, the generated file, and every tag in the data files and pages
against the vocabulary.

To retire a tag, keep its concept and add `deprecated: true`. When one concept takes its
place, add `replacedBy: <id>` too. Then retag the entries. A literature link that still uses
the old tag shows its replacement. A retired tag with no `replacedBy` is dropped from old
links, so the filter it set goes away.

[`vocabulary/context.jsonld`](vocabulary/context.jsonld) maps the YAML fields to SKOS. The
build uses it to publish the vocabulary at `/vocabulary.ttl` and `/vocabulary.jsonld`, and
CI checks the Turtle against the SHACL shape of SkoHub Vocabs. It holds no `@base` or
`@vocab`: `src/lib/skos.ts` adds the namespace when it builds. A new field in
`vocabulary.yaml` needs a term here, or it is published in the site's namespace instead of
SKOS.

### Look and feel

Visual rules are in [`DESIGN.md`](DESIGN.md); who the site is for is in [`PRODUCT.md`](PRODUCT.md).

- Number every new figure or table, and give it a source line that names its data file.
- Number tables by chapter. Table 4.1 is the first table in chapter 4. Figure numbering
  starts with Fig. 1 on the home page.
- In Markdown, set the title as `<p class="table-title"><b>Table 4.1</b> …</p>` and the source as `<p class="table-src">Source: …</p>`.
- For a figure that counts entries at build time, see [`FlowFigure.astro`](src/components/FlowFigure.astro).
- A new IE field needs four things beside its concept in the vocabulary: a short label, a `.field-<tag>` ink rule, a link in the field list on the map page, and its own page at `src/content/docs/applications-map/<tag>.mdx`. That page holds a short definition of the field, what works today with `<Cite>` references, `<FieldPage ie="<tag>" />`, and the field's gaps; copy an existing one. The type check and `pnpm test` flag a missing one. Ink 6 is the one left, so a new field needs a maintainer decision first (see "One meaning per ink" in DESIGN.md). A domain such as water or chemicals is a topic, not a field: topics take no ink.

### Checking accessibility

`pnpm install` sets up the git hooks, which run with [prek](https://prek.j178.dev/). On each commit they check formatting, spelling, links, the workflows and the commit message; before each push they run the type check and the tests. A hook that fixes a file fails the commit: `git add` the file and commit again. The first commit on a clone downloads the hooks' tools, so it needs a network connection. The build and the accessibility check run in CI. To run the accessibility check locally:

1. Run `pnpm exec playwright install chromium` (once).
2. Run `pnpm run build`, then `pnpm exec astro preview` in one terminal.
3. Run `pnpm run test:a11y` in another.

The check runs axe on every page (and the 404 page) in light and dark, at desktop and phone width. It fails on a page wider than the screen, also at 320px with text at 200%, and it checks the literature filter's keyboard behaviour. Lines starting "not decided by axe" are listed but don't fail.

### Adding an interactive demo

See [two ways to add a demo](https://ai4ie.org/demos/#two-ways-to-add-a-demo) on the demos page. Link new demos from the matching `demo:` field in `src/data/applications.yaml`.

### Adding an Agent Skill

One folder per skill under `skills/`, with a `SKILL.md` and any supporting files.

1. Copy [`skills/SKILL-template.md`](skills/SKILL-template.md) to `skills/<your-skill-name>/SKILL.md`, or use [`skills/ml-reproducibility/SKILL.md`](skills/ml-reproducibility/SKILL.md) as an example. The `name` field in the front matter must match the folder name: lowercase letters, numbers and single hyphens, at most 64 characters, not starting or ending with a hyphen ([specification](https://agentskills.io/specification)).
2. Write the `description` so the assistant knows when to load the skill: the task, the inputs, and what the skill checks. Until the task comes up, the assistant reads only the `name` and this line.
3. Write the steps. End each check with a result you can verify, such as a known answer or a balance that must close.
4. Try it on a real task in a fresh session. Keep it generic enough that someone else can use it without editing.

## Changing code

A change to code comes with tests. A fix adds a test that fails without it, and a feature adds
one for what it does. Run `pnpm run check`, `pnpm run lint` and `pnpm test` before you push; CI
runs them on every pull request.

CI also weighs every built page: the page's gzipped HTML plus the CSS, JS, fonts and images it
loads on a first visit. A page over its budget fails the build. Check it with `pnpm run build`
and then `pnpm run page-weight`. If a page has to get heavier, raise its budget in
[`scripts/page-weight.mjs`](scripts/page-weight.mjs) and say why in the pull request.

The citation files `CITATION.cff`, `codemeta.json` and `.zenodo.json` must agree, and a hook
checks that they do. Edit `CITATION.cff`, then run
`pnpm exec prek run citesync-write --stage manual --all-files` to update the other two.

Coding standards: [Biome](https://biomejs.dev) formats and lints everything, so run
`pnpm run lint:fix` rather than formatting by hand. Comments say why, not what. A new
dependency needs a licence the `pnpm run licenses` check allows.

Name the pull request like a commit, `type(scope): summary`, such as `fix(literature): sort
by year`. The title becomes the squash commit.

## Questions

Open an issue, or ask in the [AI4IE Discord](https://discord.gg/zhHAZakXHX): a small server of IE researchers working with AI, open to anyone.
