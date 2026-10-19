# Design

The site is set like a statistical yearbook for industrial ecology. Each chapter has a number
and a printing ink, a running head sits above every page title, and claims appear as numbered
tables and figures with a source line. The home page opens on Fig. 1, a material-flow (Sankey)
diagram of the literature, from IE field to AI technique.

Exact values (colours, sizes, breakpoints) live in
[`src/styles/custom.css`](src/styles/custom.css). This file holds the rules behind them.

## Colour

The theme follows the reader's system setting: a blue-black page with
near-white text in dark, a cool white page with near-black text in light. Five printing inks
carry all colour; everything else is grey.

| Ink | Chapter | IE field |
| --- | --- | --- |
| 1 cobalt | Map | LCA |
| 2 vermilion | Literature | Waste, EoL & circularity |
| 3 olive | Best practices | MFA |
| 4 ochre | Tools | Urban mining |
| 5 plum | Demos | none |

Cobalt is also the accent: links, focus rings, the primary button.

- **One meaning per ink.** An ink marks its chapter and its field, nothing else, never
  decoration. A new chapter or field needs an ink no other meaning uses; all five are taken.
- **Swatch, not fill.** Outside Fig. 1, an IE field shows its ink as a small square beside
  its label, never as a filled chip or coloured text.
- **One hue for counts.** The map grid shades counts in cobalt at three strengths (1, 2,
  3 or more). An empty cell is a dashed outline.
- **Contrast.** Every ink passes 4.5:1 as text on its own theme's page colour; check a new
  use in both themes.

## Type

- **Archivo**, set narrow (`font-stretch` 72–90%), for anything that names, numbers or
  navigates: titles, tables, tabs, labels, buttons.
- **Source Serif 4** for anything read through: paragraphs, ledes, blurbs, at most 68
  characters a line.
- **Martian Mono** for code only.

The fonts are self-hosted from their npm packages through Astro's font settings in
`astro.config.mjs`, with `font-display: optional`, so a late font never shifts the layout.
Narrow widths shrink the space between words, so narrow text takes `word-spacing: 0.1em`.
Columns of numbers use tabular figures.

## Layout and form

- Starlight's shell, 48rem content width. The home page has no sidebar, so a numbered chapter
  index under the cover stands in for it. No docs-site hero with a button pair and a card grid.
- Square corners everywhere, Starlight's own controls included.
- No shadows. Structure comes from rules: a 2px ink rule under running heads and over table
  heads, 1px hairlines between rows. A panel that opens pushes content down instead of
  covering it.
- A dashed outline means a gap (the "Wanted" mark, an empty map cell) or a content-type tag.
  Never use it as decoration.
- On touch screens, filter controls are at least 44px tall; Fig. 1's labels have a hit area of
  at least 24px.

## The mark

The mark is an Æ with a 4 drawn inside it ([`Glyph.astro`](src/components/Glyph.astro)). It
sits outside the five inks: on the page it is neutral ink, with the 4 at full strength and
the A's leg and the E's arms faded to grey. Cobalt is ink 1, so the mark is cobalt only off
the page: the favicon and the README.

- **Once per page, twice on the cover.** Inner pages show it only as the end mark in the
  colophon, before the licences. The cover adds it as chapter 0 in the running head. The 404
  page shows it once, as Fig. 404 in a dashed frame (a missing page is a gap). On phones it
  also replaces the wordmark in the header, where the wordmark's own 4 would otherwise sit.
- **Never decoration.** No patterns, bullets, loaders or watermarks.
- **Always named by something else:** the text beside it, or the header link's label. The
  SVG itself stays hidden from screen readers.

## Components

- **Running head.** Chapter number and title on the left, site name on the right (dropped on
  phones), over a 2px ink rule.
- **Sidebar.** Each chapter carries a square number block in its ink; the current page gets a
  light tint of that ink.
- **Fig. 1.** Built from `literature.yaml` at build time. Node numbers count papers; band width
  counts field-technique pairings, as the caption says. Each node opens the literature list
  holding exactly the papers it counts. Labels are the first words of each tag's full name.
  Pointing at a band lifts it and fades the rest.
- **Fig. 2.** The see, read, try path for one map cell, each step topped by the ink of the
  chapter it links to.
- **Numbered tables.** A bold "Table N.N" title above, a source line below. Numbering and
  markup are in [CONTRIBUTING.md](CONTRIBUTING.md#look-and-feel).
- **Application entries.** On the map page, each field's section has its synthesis paragraph,
  then its applications as disclosures: closed, the name over the maturity call; open, the
  description, tags and papers link.
- **Literature filter.** One disclosure button per dimension; its chips open in the page
  under the bar. Pressed chips and active filters are solid ink.
- **Asides and cards.** Asides are a light tint of their ink with a 1px border and no side
  bar. Starlight cards lose their box and icon and get a 3px ink rule on top.
- **Buttons.** One filled (cobalt) action per page; the rest are text links or 1px outlines.
