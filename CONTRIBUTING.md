# Contributing

Contributions are welcome from anyone. If you've found hardware that works, a tool worth the time, a prompt that saves you an hour, or a place AI is being used in IE, please add it!

## The short version

1. **Papers and applications live in data files**, not text:
   [`src/data/literature.yaml`](src/data/literature.yaml) and
   [`src/data/applications.yaml`](src/data/applications.yaml). Copy a neighbouring
   entry and edit the fields. The pages build themselves from the data.
2. **Everything else** is a Markdown page under `src/content/docs/`:
   `best-practices/`, `tools/`, `demos.mdx`, `applications-map/index.mdx`.
   Add an entry in the same format as its neighbours.
3. Open a pull request. One entry per PR is fine.

You don't need to run anything locally to edit text. Edit the Markdown on GitHub, or click the **edit pencil** on any page of the live site. To preview locally, see the [quick start](README.md#quick-start).

### Adding a paper or an application

- Tags come from the shared vocabulary in [`src/data/tags.ts`](src/data/tags.ts) (IE field · AI technique · entry type). Need a tag that doesn't exist? Add it there in the same PR, with a short label in `SHORT_LABELS` (the start of the full label, for Fig. 1 on the home page).
- Literature entries need an `id` (the citation key), `title`, `authors`, `year`, a one-line `blurb` saying why it's worth reading, tags, and `added: YYYY-MM`. Write `authors` as a list with one `"Surname, I."` per author, and add `etAl: true` when you stop before the last author. Give a `doi` (the bare `10.…` id), an `arxiv` id (the bare id, such as `2401.01234`), or both.
- An entry shows a "new" marker in the list for about two months after the start of its `added` month.
- Application entries need both tag dimensions (`ie:` and `ml:`), an honest one-line `maturity:`, and `papers:` referencing literature ids.
- `npm run test` checks every field, tag, and cross-reference. CI runs it on your PR.

### Citing a source in prose

If the source is in the reading list, or should be, don't paste a bare link. Use the `Cite` component. It looks up the entry by `id` when the site builds, and links to the reading list filtered to that one paper:

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
- **Date what goes stale.** Prices, specs, and model names change; add the month you checked (`YYYY-MM`).
- **Sensitive data:** say whether a tool sends data off-device. It matters for confidential industry data and personal data.
- **Match the existing format** on the page you're editing. Don't restructure a page in a content PR.

## Extending the site

### Adding a page

Create `src/content/docs/your-section.md` with a `title:` in the front matter, then add it to `sidebar:` in [`astro.config.mjs`](astro.config.mjs), which holds the sidebar order and titles:

```js
{ label: 'Your section title', slug: 'your-section' },
```

A page inside an existing chapter needs nothing else. A new top-level entry is a new chapter: it also needs an entry in [`src/lib/chapters.ts`](src/lib/chapters.ts) and one of the five inks in [`src/styles/custom.css`](src/styles/custom.css) (an `--ink-N` pair and the sidebar's `li:nth-child` rule). All five are in use, so open an issue first. `npm test` checks that they agree.

### Look and feel

[`DESIGN.md`](DESIGN.md) holds the visual rules: colours, fonts, spacing and components. [`PRODUCT.md`](PRODUCT.md) says who the site is for. Number every new figure or table and give it a source line naming its data file. Tables are numbered by chapter ("Table 4.1" is the first table in chapter 4); figures run on from Fig. 1 and Fig. 2 on the home page. In Markdown, set the title as `<p class="table-title"><b>Table 4.1</b> …</p>` and the source as `<p class="table-src">Source: …</p>`. For a figure built from the data, start from [`src/components/PathFigure.astro`](src/components/PathFigure.astro): it counts entries at build time, so its numbers stay true as entries are added.

A new IE field needs three things beside its tag: a short label, a `.field-<tag>` ink rule, and a `<FieldApplications ie="<tag>" />` section on the map page. The type check and `npm test` flag a missing one. All five inks are taken, so a fifth field needs a maintainer decision first (see the Two Jobs Rule in DESIGN.md). The `.impeccable/` folder holds the design tool's working records; `DESIGN.md` is the one to read.

To run the accessibility check locally: `npx playwright install chromium` once, then `npm run build`, `npx astro preview` in one terminal and `npm run test:a11y` in another. It runs axe on every page (and the 404 page) in light and dark, at desktop and phone width, fails on a page wider than the screen, and checks the literature filter's keyboard behaviour. Lines starting "not decided by axe" are listed but do not fail. The git hooks run lint, tests and the type check; the build and this check run in CI.

### Adding an interactive demo

See [two ways to add a demo](https://simonvanlierde.github.io/awesome-ai4ie/demos/#two-ways-to-add-a-demo) on the demos page. Link new demos from the matching `demo:` field in `src/data/applications.yaml`.

### Adding a Claude skill

One folder per skill under `skills/`, with a `SKILL.md` and any supporting files. Start from [`skills/SKILL-template.md`](skills/SKILL-template.md), or use [`skills/ml-reproducibility/SKILL.md`](skills/ml-reproducibility/SKILL.md) as an example. Keep it generic enough that someone else can use it without editing.

## Questions

Open an issue, or ask in the [AI4IE Discord](https://discord.gg/zhHAZakXHX): a small server of IE researchers working with AI, open to anyone with an interest.
