# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Industrial ecology (IE) researchers, mostly life cycle assessment (LCA) and material flow
analysis (MFA) researchers and PhD students in or near the AI4IE working group. They arrive
asking "what can AI do for my field, and can I trust it?" and read to decide where to start.
Students new to machine learning and research software engineers (RSEs) building tools come
second.

## Product Purpose

A community-curated guide to using AI in IE research: a map of applications by IE field and
AI technique, a tag-filterable literature list, best practices and checklists, tool and
hardware guidance, and worked demos. A visit succeeds when the reader finds a trustworthy
entry point for their own field, and some readers go on to contribute: open a pull request
or join the Discord.

## Positioning

One shared tag vocabulary (IE field × AI technique) links the map, the literature and the
demos, so every application area can be followed the same way: see what works, read the
evidence, try it. Every map entry carries a maturity call, and the known gaps are listed by
name instead of left implicit.

## Operating Context

- Read in a browser between other work, often from a link shared in the working group's
  Discord or a talk; also on phones.
- It is a proposal from one maintainer to the working group, still in a demo phase, and
  meant to be argued with and handed over.
- Contributions arrive as pull requests against two YAML data files and Markdown pages.

## Capabilities and Constraints

- Astro with Starlight, deployed to GitHub Pages under `/awesome-ai4ie/`. No server: GitHub
  Pages sets no headers.
- Three React islands: the literature browser, the applications explorer, and an in-browser
  CLIP zero-shot demo that loads transformers.js from cdn.jsdelivr.net and a model from
  huggingface.co only on demand.
- Data in `src/data/literature.yaml` and `applications.yaml`, Zod-validated at build and in
  tests; tags must come from `src/data/tags.ts`.
- Terminology: "IE field" and "AI technique" are the two map axes; "Wanted" marks an open
  gap or placeholder.
- Undecided: the working group has not adopted the site; the org move and a second
  maintainer are open.

## Brand Commitments

Name: "Awesome AI for Industrial Ecology", short form AI4IE. The user stated that nothing in
the current look (palette, mark, Starlight shell) is binding.

## Evidence on Hand

- 75 literature entries and 17 application entries in `src/data/`.
- Two worked skills in `skills/`, the CLIP demo, and two embedded Hugging Face Spaces.
- The logo and mark SVGs in `src/assets/`, the social card `public/og.png`.
- No testimonials, adoption figures or user counts exist; do not invent any.

## Product Principles

1. Evidence before enthusiasm: every claim of what AI can do points to a source and a
   maturity call.
2. Gaps are content: what is not mapped yet is named, as an invitation to contribute.
3. One vocabulary everywhere: the same tags and terms on every page.
4. A proposal, not a product: the site invites argument and makes contributing obvious.

## Accessibility & Inclusion

WCAG 2.2 AA. Axe runs in CI on the built site (11 pages, light and dark) and must stay at
zero violations in the repo's own code.
