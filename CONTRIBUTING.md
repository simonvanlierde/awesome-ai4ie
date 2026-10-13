# Contributing

This started in the **AI4IE working group**, but it's a community resource and contributions are welcome from anyone. If you've found hardware that works, a tool worth the time, a prompt that saves you an hour, or a place AI is being used in IE, please add it!

## The short version

1. **Papers and applications live in data files**, not text:
   [`src/data/literature.yaml`](src/data/literature.yaml) and
   [`src/data/applications.yaml`](src/data/applications.yaml). Copy a neighbouring
   entry, edit the fields, done; the pages render themselves.
2. **Everything else** is a Markdown page under `src/content/docs/`:
   `best-practices/`, `tools/`, `demos.mdx`, `applications-map/index.mdx`.
   Add an entry in the same format as its neighbours.
3. Open a pull request. One entry per PR is fine.

### Adding a paper or an application

- Tags come from the shared vocabulary in [`src/data/tags.ts`](src/data/tags.ts) (IE field · AI technique · entry type). Need a tag that doesn't exist? Add it there in the same PR; a tag ships together with its first entry.
- Literature entries need: `id` (citation key), `title`, `authors` (a list with one `"Surname, I."` per author; add `etAl: true` when you stop before the last author), `year`, `doi` (the bare `10.…` id) or `arxiv` (the bare id, such as `2401.01234`) or both, a one-line `blurb` saying why it's worth reading, tags, and `added: YYYY-MM`. An entry gets a "new" marker in the list for about two months after the start of its `added` month.
- Application entries need both tag dimensions (`ie:` and `ml:`), an honest one-line `maturity:`, and `papers:` referencing literature ids.
- `npm run test` validates every field, tag, and cross-reference; CI runs it on your PR, so a typo can't break the site.

You don't need to run anything locally to edit text. Editing the Markdown on GitHub is enough, or use the **edit pencil** on any page of the live site, which takes you straight to the file.

### Citing a source in prose

Don't paste a bare link when the source is (or should be) in the reading list. Use the `Cite` component, which looks the entry up by `id` at build time and links to the reading list filtered to that one paper:

```mdx
---
title: Your page
---

import Cite from '../../components/Cite.astro';

Label readability collapses at the recycler <Cite id="sterkensProductLabelIdentification2023" />.
```

That renders `(Sterkens et al., 2023)`. Author and year come from `literature.yaml`, so a citation can't drift out of sync with the data, and a wrong or missing `id` **fails the build** rather than shipping a dead reference.

When the prose already names the thing, pass the name as children so the wording survives:

```mdx
foundation segmenters (<Cite id="kirillovSegmentAnything2023">SAM</Cite>, …)
```

Two rules of thumb:

- **A claim with a number in it needs a citation.** If the paper behind it isn't in `literature.yaml` yet, add it in the same PR — that's the point of the format.
- **If you can't find the source, don't guess.** Leave the claim uncited and mark it `TODO`, so the gap is visible instead of implied.

## Ground rules

- **No fabricated entries.** Every tool, paper, or number must be real and checkable. If you're not sure, mark it `TODO` and say what needs confirming.
- **Date what goes stale.** Prices, specs, and model names change; add the month you checked (`YYYY-MM`).
- **Sensitive data:** flag whether a tool sends data off-device. It matters for confidential industry and personal data.
- **Match the existing format** on the page you're editing. Don't restructure a page in a content PR.

## How the site works

[Astro](https://astro.build) + the [Starlight](https://starlight.astro.build) docs theme. Each Markdown file under `src/content/docs/` is a page. The **sidebar order and titles live in [`astro.config.mjs`](astro.config.mjs)** under `sidebar:`. GitHub builds and deploys on merge to `main`.

To add a **new section page**:

1. Create `src/content/docs/your-section.md` with a title in the front matter:

  ```markdown
   ---
   title: Your section title
   ---

   Your content here.
   ```

1. Add it to the `sidebar` in `astro.config.mjs` where you want it:

   ```js
   { label: 'Your section title', slug: 'your-section' },
   ```

### Adding an interactive demo

Two options:

- **External app** (anything that calls a hosted model; it needs a backend): host it (Hugging Face Space, an institute server, a small FastAPI app) and add it to the [demos page](src/content/docs/demos.mdx): a Hugging Face Space with [`SpaceEmbed`](src/components/SpaceEmbed.astro), which loads it only when the reader clicks, anything else with an `<iframe>` and a text link.
- **In-page island** (client-side, no backend needed, including in-browser inference via transformers.js): copy [`src/components/ZeroShotDemo.tsx`](src/components/ZeroShotDemo.tsx), then use it in an `.mdx` page: `import YourDemo from '...'` and `<YourDemo client:visible />`.

Link new demos from the matching `demo:` field in `src/data/applications.yaml`.

### Adding a Claude skill

Skills live under `skills/`, one folder per skill:

```text
skills/
  your-skill-name/
    SKILL.md        # the skill (see skills/SKILL-template.md)
    ...             # any supporting files
```

Start from [`skills/SKILL-template.md`](skills/SKILL-template.md), or use
[`skills/ml-reproducibility/SKILL.md`](skills/ml-reproducibility/SKILL.md) as an example. Keep it generic enough that someone else can use it without editing.

## Preview locally (optional)

```bash
npm install
npm run dev
# open http://localhost:4321/awesome-ai4ie/
```

## Questions

Open an issue, or ask in the [AI4IE Discord](https://discord.gg/zhHAZakXHX): a small server of IE researchers working with AI, open to anyone with an interest.
