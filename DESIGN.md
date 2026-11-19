# Design

The site is set like a statistical yearbook for industrial ecology. Each chapter has a number
and a printing ink, a running head sits above every page title, and claims appear as numbered
tables and figures with a source line. The home page opens on Fig. 1, a material-flow (Sankey)
diagram of the literature, from IE field to AI technique.

Exact values (colours, sizes, breakpoints) live in
[`src/styles/custom.css`](src/styles/custom.css). This file holds the rules behind them.

## Colour

The theme follows the reader's system setting in a blueprint / cyanotype palette: a deep
Prussian blueprint page in dark, a cool ice-slate page in light. Six printing inks carry all
colour; everything else is slate grey.

| Ink | Chapter | IE field |
| --- | --- | --- |
| 1 cobalt | Map | Life cycle assessment |
| 2 cadmium red | Literature | Circular economy |
| 3 verdigris teal | Best practices | Socio-economic metabolism |
| 4 brass | Tools | Input-output |
| 5 indigo | Demos | Industrial symbiosis |
| 6 moss | none | free, for the next field |

Cobalt is also the accent: links, focus rings, the primary button.

- **One meaning per ink.** An ink marks its chapter and its field, nothing else, never
  decoration. A new chapter or field needs an ink no other meaning uses. Ink 6 is the one
  left, for a field only, so the five chapters keep five tab colours. Topics, techniques
  and paper types take no ink: that keeps the inks few enough to tell apart.
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
sits outside the six inks: on the page it is neutral ink, with the 4 at full strength and
the A's leg and the E's arms faded to grey. The stem is the I of AI4IE, so it takes a lighter
tint; the large mark (the 404 plate, the card) also cuts a hairline gap beside it. Cobalt is ink 1, so the mark is cobalt only off
the page (the favicon and the README), with one exception: the home title ends on the
favicon tile as its end mark, at cap height, hidden from screen readers. On load its strokes
ink in as the mark is drawn: the 4, its stem, then the faded A leg and E arms. Pointing at
or tapping the tile inks them in again.

- **Header, home cover, colophon, and 404.** The top bar shows the unfolded `AI4IE` drafting
  wordmark, which collapses to the Æ-4 mark on hover/focus and on narrow screens. The home
  cover carries no mark of its own: the header wordmark and the title already name the site.
  The 404 plate shows the Æ-4 mark in a dashed
  frame and expands it into `AI4IE` on hover/focus. Every inner page
  and the home page also carry the mark in the colophon before the licences.
- **Never decoration.** No patterns, bullets, loaders or watermarks.
- **Always beside text** that carries the meaning, so the SVG stays hidden from screen
  readers.

## Components

- **Running head.** Chapter number and title on the left, site name on the right (dropped on
  phones), over a 2px ink rule.
- **Sidebar.** Each chapter carries a square number block in its ink; the current page gets a
  light tint of that ink.
- **Fig. 1.** Built from `literature.yaml` at build time. From 64rem it spans the cover below the
  title, wide and short with long bands; narrower screens get a compact plate. Node numbers count papers; band width
  counts field-technique pairings, as the caption says. Each node opens the literature list
  holding exactly the papers it counts. Labels are the first words of each tag's full name.
  Pointing at a band lifts it and fades the rest. Pointing at, focusing or tapping a node
  lights its bands and names its reach in a live readout line under the plate; on touch the
  first tap lights a node and the second opens its list. On load the bands run in once from
  the fields while the title's end mark inks in: together the site's one entrance, under a
  second. Reduced motion skips both.
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
