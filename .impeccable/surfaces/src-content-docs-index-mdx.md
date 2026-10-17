---
version: 1
slug: "src-content-docs-index-mdx"
primary_target: "src/content/docs/index.mdx"
related_targets: ["src/styles/custom.css"]
---

## Scope

Whole site (every Starlight page, the home splash, the three React islands). Visitor mode: Read. Code-led.

## Audience and job

IE researchers (LCA, MFA, PhD students) asking what AI can do for their field and whether to trust it; success is finding a trustworthy entry point, then contributing. Ruled out by the author: startup gloss, dry institutional, dense or hard to scan, playful or cute.

## Direction contract

THESIS: The site is an IE yearbook with a flow plate on its cover: every claim set as a numbered table or figure with its source line, and the whole field shown as one material flow from IE field to AI technique. Refuses the docs-site hero with a button pair and a card grid.

OWN-WORLD: Cool white stock (dark: blue-black stock), black ink, five printing inks (cobalt, vermilion, olive, ochre, plum) that mark the five chapters on numbered thumb-index tabs and the four IE fields in flow bands. Archivo in narrow widths for titles, tables, tabs and labels; Source Serif 4 for reading; mono only for code. Square corners, hairline rules, a 2px ink rule under running heads.

STORY: The reader sees the shape of the field at once (the flow), finds their field, follows a band to the evidence, and sees named gaps as invitations to add the first paper.

FIRST VIEWPORT: Desktop: sidebar as a numbered thumb index; running head above the title; left column of title (Archivo narrow, ~56px), a two-sentence lede and one primary action "Open the applications map"; right column Fig. 1, a build-time Sankey of vetted papers per IE field to AI technique, each band a link to the filtered literature list, with a figure caption and Source line. Phone: title, lede and action within the first 500px, a simplified Fig. 1 below.

FORM: Hybrid of grounded candidates 4 (Statistical Yearbook, assigned) and 1 (Material Flow Atlas, pick), chosen by the author. Signature: the Sankey cover figure; second system: Table numbering with Source lines and shaded count cells with dashed Wanted gaps on the map grid. seed:ac75c6dbb13e923d

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- No maturity rubric exists (maturity is prose), so shading encodes paper counts only.

## Adaptations (recorded 2026-10-17)

- Home: Starlight's splash template has no sidebar, and the author chose to keep Starlight. The cover's numbered chapter strip stands in for the thumb index there.
- Phone: Fig. 1 keeps every node with enlarged labels rather than a reduced plate, so the phone shows the same evidence as the desktop. Revisit if the technique count grows past about eight.
- "How it fits together" stays a numbered list, not a figure: three linked steps, and a figure would only restyle them.
