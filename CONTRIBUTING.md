# Contributing

Anyone can contribute. If you've found hardware that works, a tool worth the time, a prompt that saves you an hour, or a place where AI is used in IE, please add it!

## The short version

**No pull request needed.** [Suggest a paper](../../issues/new?template=paper.yml),
[map an application](../../issues/new?template=application.yml),
[suggest a tool](../../issues/new?template=tool.yml) or
[suggest anything else](../../issues/new?template=other.yml). Each is a short form, and a
maintainer turns it into an entry. The forms need a free GitHub account. Without one, post in
the [AI4IE Discord](https://discord.gg/zhHAZakXHX).

To make the change yourself:

1. **Papers and applications live in data files**, not in page text:
   [`src/data/literature.yaml`](src/data/literature.yaml) and
   [`src/data/applications.yaml`](src/data/applications.yaml). Copy a neighbouring
   entry and edit the fields. The pages are built from the data.
2. **Everything else** is a Markdown page under `src/content/docs/`:
   `best-practices/`, `tools/`, `demos.mdx`, `applications-map/index.mdx`.
   Copy the format of the entries next to yours.
3. Open a pull request. One entry per PR is fine. Name it like a commit, such as
   `feat(literature): add Smith 2025`: a check fails on a title such as "Update literature.yaml".

To edit text, you need no local setup: edit the Markdown on GitHub, or click the **edit pencil** on any page of the live site. To preview locally, see the [development section](README.md#development).

### Adding a paper or an application

- Tags come from the shared vocabulary in [`src/data/tags.ts`](src/data/tags.ts) (IE field · AI technique · entry type). Need a tag that doesn't exist? Add it there in the same PR, with a short label in `SHORT_LABELS` (the start of the full label, for Fig. 1 on the home page). Add its full label to the matching dropdown in the paper and application forms in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) too. `pnpm test` checks that they match.
- Literature entries need an `id` (the citation key), `title`, `authors`, `year`, a one-line `blurb` saying why it's worth reading, tags, and `added: YYYY-MM`.
- Write `authors` as a list with one `"Surname, I."` per author. Add `etAl: true` when you stop before the last author.
- Give a `doi` (the bare `10.…` id), an `arxiv` id (the bare id, such as `2401.01234`), or both.
- An entry is marked "new" in the list for about two months from the start of its `added` month.
- Application entries need both tag dimensions (`ie:` and `ml:`), an honest one-line `maturity:`, and `papers:` referencing literature ids.
- `pnpm test` checks every field, tag, and cross-reference. CI runs it on your PR.
- A maintainer fetches the full BibTeX and RIS record for a new paper after merging. If you work locally, you can run `pnpm run citations` yourself.

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
- **If you can't find the source, don't guess.** Leave the claim uncited and mark it `TODO`.

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

### Look and feel

Visual rules are in [`DESIGN.md`](DESIGN.md); who the site is for is in [`PRODUCT.md`](PRODUCT.md).

- Number every new figure or table, and give it a source line that names its data file.
- Tables are numbered by chapter: "Table 4.1" is the first table in chapter 4. Figures continue from Fig. 1 and Fig. 2 on the home page.
- In Markdown, set the title as `<p class="table-title"><b>Table 4.1</b> …</p>` and the source as `<p class="table-src">Source: …</p>`.
- For a figure built from the data, start from [`src/components/PathFigure.astro`](src/components/PathFigure.astro). It counts entries at build time, so its numbers stay true as entries are added.
- A new IE field needs three things beside its tag: a short label, a `.field-<tag>` ink rule, and a `<FieldApplications ie="<tag>" />` section on the map page. The type check and `pnpm test` flag a missing one. All six inks are taken, so a seventh field needs a maintainer decision first (see "One meaning per ink" in DESIGN.md).

### Checking accessibility

`pnpm install` sets up the git hooks, which run with [prek](https://prek.j178.dev/). On each commit they check formatting, spelling, links, the workflows and the commit message; before each push they run the type check and the tests. A hook that fixes a file fails the commit: `git add` the file and commit again. The first commit on a clone downloads the hooks' tools, so it needs a network connection. The build and the accessibility check run in CI. To run the accessibility check locally:

1. Run `pnpm exec playwright install chromium` (once).
2. Run `pnpm run build`, then `pnpm exec astro preview` in one terminal.
3. Run `pnpm run test:a11y` in another.

The check runs axe on every page (and the 404 page) in light and dark, at desktop and phone width. It fails on a page wider than the screen, also at 320px with text at 200%, and it checks the literature filter's keyboard behaviour. Lines starting "not decided by axe" are listed but don't fail.

### Adding an interactive demo

See [two ways to add a demo](https://ai4ie.org/demos/#two-ways-to-add-a-demo) on the demos page. Link new demos from the matching `demo:` field in `src/data/applications.yaml`.

### Adding a Claude skill

One folder per skill under `skills/`, with a `SKILL.md` and any supporting files. Start from [`skills/SKILL-template.md`](skills/SKILL-template.md), or use [`skills/ml-reproducibility/SKILL.md`](skills/ml-reproducibility/SKILL.md) as an example. Keep it generic enough that someone else can use it without editing.

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
