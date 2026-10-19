# Product

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
evidence, try it.

## Operating Context

- Read in a browser between other work, often from a link shared in the working group's
  Discord or a talk; also on phones.
- It is a proposal from one maintainer to the working group, still in a demo phase, and
  meant to be argued with and handed over. The working group has not adopted it yet; the
  org move and a second maintainer are open.
- Contributions arrive as pull requests against two YAML data files and Markdown pages.

## Capabilities and Constraints

- Astro with Starlight, deployed to GitHub Pages under `/awesome-ai4ie/`, or at the root of
  a custom domain once `src/site.ts` names one. No server: GitHub Pages sets no headers.
- Three React islands: the literature browser, the applications explorer, and an in-browser
  CLIP zero-shot demo that loads transformers.js from cdn.jsdelivr.net and a model from
  huggingface.co only on demand.
- Data in `src/data/literature.yaml` and `applications.yaml`, Zod-validated at build and in
  tests; tags must come from `src/data/tags.ts`.
- Terminology: "IE field" and "AI technique" are the two map axes; "Wanted" marks an open
  gap or placeholder.

## Brand Commitments

Name: "Awesome AI for Industrial Ecology", short form AI4IE. Beyond the name, the look
(palette, mark, Starlight shell) is open to change.

## Evidence on Hand

- 75 literature entries and 17 application entries in `src/data/`.
- Two worked skills in `skills/`, the CLIP demo, and two embedded Hugging Face Spaces.
- The logo SVGs in `src/assets/`, the favicon and the social card in `public/`.
- No testimonials, adoption figures or user counts exist; do not invent any.

## Product Principles

1. Evidence before enthusiasm: every claim of what AI can do points to a source, and every
   map entry carries a maturity call.
2. Gaps are content: what is not mapped yet is named, as an invitation to contribute.
3. One vocabulary everywhere: the same tags and terms on every page.
4. A proposal, not a product: the site invites argument and makes contributing obvious.

## Accessibility & Inclusion

WCAG 2.2 AA. Axe runs in CI on the built site (12 pages including the 404, light and dark,
desktop and phone), and the repo's own code must stay at zero violations. How to run it is
in [CONTRIBUTING.md](CONTRIBUTING.md#checking-accessibility).
