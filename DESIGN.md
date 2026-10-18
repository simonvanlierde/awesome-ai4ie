---
name: Awesome AI for Industrial Ecology
description: A community-curated guide to AI in industrial ecology, set as a statistical yearbook with a material-flow plate on its cover.
colors:
  ink-cobalt: "#8eaaff"
  ink-vermilion: "#ff8f70"
  ink-olive: "#b9cb70"
  ink-ochre: "#e9b85a"
  ink-plum: "#dca0d9"
  ink-cobalt-light: "#2148a8"
  ink-vermilion-light: "#b4391f"
  ink-olive-light: "#55661a"
  ink-ochre-light: "#855b05"
  ink-plum-light: "#6d2f6b"
  stock-dark: "#121419"
  black-ink-dark: "#f1f2f4"
  gray-1-dark: "#dcdfe3"
  gray-2-dark: "#bcc1c8"
  gray-3-dark: "#969ca5"
  gray-4-dark: "#5f656e"
  gray-5-dark: "#3a3f47"
  gray-6-dark: "#22262c"
  hairline-dark: "#2c3038"
  accent-low-dark: "#1c2648"
  accent-high-dark: "#d3ddff"
  stock-light: "#f7f8f6"
  black-ink-light: "#16181d"
  gray-1-light: "#24272d"
  gray-2-light: "#3a3e45"
  gray-3-light: "#5b616a"
  gray-4-light: "#8a9098"
  gray-5-light: "#c9cdd2"
  gray-6-light: "#eaecee"
  hairline-light: "#d6d9dd"
  accent-low-light: "#dfe6f7"
  accent-high-light: "#142f73"
  on-ink-light: "#ffffff"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.5rem + 3.4vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 72"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 2.4vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 760
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 80"
  subtitle:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    fontVariation: "'wdth' 88"
  body:
    fontFamily: "Source Serif 4 Variable, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  lede:
    fontFamily: "Source Serif 4 Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.125rem, 1rem + 0.4vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    fontVariation: "'wdth' 85"
  caption:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  code:
    fontFamily: "Martian Mono Variable, ui-monospace, SF Mono, monospace"
    fontSize: "0.82em"
rounded:
  none: "0px"
spacing:
  xs: "0.35rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-cobalt}"
    textColor: "{colors.stock-dark}"
    rounded: "{rounded.none}"
    typography: "{typography.label}"
  button-primary-light:
    backgroundColor: "{colors.ink-cobalt-light}"
    textColor: "{colors.on-ink-light}"
    rounded: "{rounded.none}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.gray-1-dark}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.55rem"
  chip-pressed:
    backgroundColor: "{colors.black-ink-dark}"
    textColor: "{colors.stock-dark}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.55rem"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.gray-2-dark}"
    rounded: "{rounded.none}"
    padding: "0.1rem 0.45rem"
  chapter-number:
    backgroundColor: "{colors.ink-cobalt}"
    textColor: "{colors.stock-dark}"
    rounded: "{rounded.none}"
    size: "1.5rem"
  input:
    backgroundColor: "{colors.stock-dark}"
    textColor: "{colors.black-ink-dark}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.6rem"
  facet-panel:
    rounded: "{rounded.none}"
    padding: "0.6rem 0"
---

## Design System: Awesome AI for Industrial Ecology

### Overview

**Creative North Star: "The Field Yearbook"**

The site is set like a statistical yearbook for industrial ecology. Each chapter has a number and a printing ink. A running head sits above every page title. Claims appear as numbered tables and figures, each with a source line. The cover figure is a material-flow (Sankey) plate, the field's own graphic: it shows the literature flowing from IE field to AI technique, and every band links to the filtered papers.

The page is paper and ink. The theme follows the reader's system setting. Dark is a blue-black stock with near-white ink; light is a cool white stock with near-black ink. The dark values are the base tokens in custom.css. Five printing inks (cobalt, vermilion, olive, ochre, plum) carry all colour, and each ink has two jobs: it marks a chapter, and four of them also mark an IE field. Everything else is grey. Corners are square, depth comes from rules rather than shadows, and type is narrow Archivo for anything that labels or structures and Source Serif 4 for anything to be read.

Density is that of a reference work: tight ruled tables, compact chips, reading text at a 68ch measure. The docs-site hero with a button pair and a card grid is rejected. The cover leads with the title, a lede, one primary action beside a text link, and Fig. 1.

**Key Characteristics:**

- Numbered chapters, each with its own ink, repeated on sidebar tabs, running heads and the home chapter index.
- Numbered figures and tables with a caption and a "Source:" line naming the data file.
- Square corners everywhere, including Starlight's own controls.
- Hairline and ink rules for structure; no cards, no drop shadows at rest.
- Narrow sans for structure, serif for reading, mono only for code.

### Colors

Two neutral stocks, one near-black ink, and five printing inks that each pass 4.5:1 as text on their own theme's ground.

#### Primary

- **Cobalt** (`ink-cobalt`, light `ink-cobalt-light`): ink 1. Chapter 1 (Map), the LCA field, and Starlight's accent: links, focus rings, the primary button, the caret, `accent-color`. Also the single hue of the count shading on the map grid.

#### Secondary

- **Vermilion** (`ink-vermilion`, light `ink-vermilion-light`): ink 2. Chapter 2 (Literature) and the waste, EoL and circularity field. Danger asides.
- **Olive** (`ink-olive`, light `ink-olive-light`): ink 3. Chapter 3 (Practice) and the MFA field. Tip asides.
- **Ochre** (`ink-ochre`, light `ink-ochre-light`): ink 4. Chapter 4 (Tools) and the urban mining field. Caution asides.

#### Tertiary

- **Plum** (`ink-plum`, light `ink-plum-light`): ink 5. Chapter 5 (Demos) only; no IE field wears it. The score bars in the zero-shot demo.

#### Neutral

- **Blue-black stock / cool white stock** (`stock-dark`, `stock-light`): page, nav and sidebar ground, and the ground of inputs, buttons and the select. Also the text colour set on an ink block in dark (`--on-ink`); light sets white (`on-ink-light`).
- **Ink** (`black-ink-dark`, `black-ink-light`): headings, table and running-head rules, pressed chips, the segmented switch border. Starlight's `--sl-color-white`.
- **Grey ramp** (`gray-1` to `gray-6`, per theme): gray-1 for serif lede and blurbs, gray-2 for captions, table headers and secondary labels, gray-3 for meta lines and source lines, gray-4 for empty-cell dashes and input borders, gray-5 for chip and trigger borders, gray-6 for inline code ground.
- **Hairline** (`hairline-dark`, `hairline-light`): row rules in tables and lists, the header border, figure-caption rules, `details` borders.
- **Accent low / high**: text selection ground and the "New" badge on literature entries.

#### Named Rules

**The Two Jobs Rule.** An ink means a chapter or an IE field, and the pairing is fixed: cobalt = 1 Map = LCA, vermilion = 2 Literature = EoL, olive = 3 Practice = MFA, ochre = 4 Tools = urban mining, plum = 5 Demos. Never use an ink for decoration, and never give a new field or chapter an ink already taken by a different meaning.

**The Swatch Not Fill Rule.** Outside the cover plate, an IE field shows its ink as a small square swatch (0.55 to 0.75rem) beside its label, never as a filled chip or coloured text.

**The One Hue Count Rule.** Count shading on a grid uses one ink at stepped strength (30%, 45%, solid for 3 and more). An empty cell is a dashed outline, not a pale fill.

### Typography

**Display Font:** Archivo Variable, width axis loaded (with ui-sans-serif, system-ui)
**Body Font:** Source Serif 4 Variable, weight axis only (with Georgia, Times New Roman)
**Label/Mono Font:** Martian Mono Variable, for code only (with ui-monospace)

**Character:** Archivo set narrow gives the dense, condensed voice of a yearbook's titles and tables. Source Serif 4 slows the reader down where the content is prose. All three are self-hosted through Fontsource.

#### Hierarchy

- **Display** (800, width 72%, `clamp(2.5rem, 1.5rem + 3.4vw, 4.5rem)`, line-height 1): the home cover title only.
- **Headline** (800, width 72%, `clamp(2.25rem, 1.6rem + 2.4vw, 3.25rem)`, line-height 1): every page title.
- **Title** (760, width 80%, 1.75rem, line-height 1.1): section heads (h2), each opened by a 1px ink rule above.
- **Subtitle** (700, width 88%, 1.25rem): h3. h4 is 700 at 1rem.
- **Body** (400, 1.0625rem, line-height 1.65): paragraphs, list items, quotes in Markdown content, at a 68ch maximum measure. Island blurbs use the same serif at 1rem, line-height 1.55.
- **Lede** (400, `clamp(1.125rem, 1rem + 0.4vw, 1.3125rem)`, line-height 1.5, max 34ch): the cover tagline.
- **Label** (600 to 750, width 82 to 90%, 0.75 to 0.95rem): running heads, sidebar entries, chips, tags, buttons, table cells, entry titles.
- **Caption** (400, 0.8125rem, line-height 1.45): figure captions, table source lines, meta lines. The "Fig. N" / "Table N.N" number is set bold in the ink colour.

#### Named Rules

**The Narrow For Structure Rule.** Anything that names, numbers or navigates is Archivo set narrow (`font-stretch` 72 to 90%). Anything a reader reads through is Source Serif 4. Interactive islands (`.not-content`) set their own text in Archivo.

**The Open Space Rule.** Narrow widths shrink the space glyph, so narrow headings, running heads, chapter titles, sidebar labels and figure text take `word-spacing: 0.1em`.

**The Tabular Figures Rule.** Tables, counts, meta lines and scores use `font-variant-numeric: tabular-nums`.

### Layout

Starlight's shell with a 48rem content width. Reading blocks cap at 68ch. Section heads take 2.75rem above them. The home page uses Starlight's splash template, which has no sidebar: the cover is a two-column grid at 64rem and up (5fr title column, 7fr Fig. 1, 3rem gap) and a single column below, and a five-column numbered chapter index below it stands in for the thumb index (one column under 50rem). At 50rem and up each chapter title gets two lines of height so the gists share a baseline.

Every docs page opens with a running head: chapter number and title on the left, the site name on the right, over a 2px ink rule. Under 40rem the right-hand part is dropped. Fig. 1 keeps every node at phone width and enlarges its labels instead of simplifying the plate. Wide tables scroll inside their own wrapper. On coarse pointers, filter triggers, chips and pills grow to a 44px minimum height.

Spacing runs on small rem steps rather than a strict scale: 0.35rem inside chip groups, 0.6rem for control padding and row gaps, 1rem for list-entry padding, 1.5rem between island blocks, 2.75rem above sections.

### Elevation & Depth

The system is flat. Depth comes from rules: a 2px ink rule under running heads, above tables, over pagination links and under group and count bars; a 1px ink rule above section heads and under tables; 1px hairlines between rows. Asides and the current sidebar item use a tint of their ink (`color-mix`, 9% and 16%) instead of a lift.

#### Shadow Vocabulary

None. Nothing floats over the page: the literature filter's chips open in the page flow, under the bar.

#### Named Rules

**The Ruled Not Raised Rule.** Surfaces sit flat on the stock and are separated by rules. No shadows; a panel that opens pushes the content down rather than covering it.

### Shapes

Square corners throughout (0px): buttons, chips, tags, inputs, panels, sidebar items, the search button and dialog, and the chapter number blocks. Starlight's rounded defaults are overridden to match. Borders are 1px solid for interactive outlines and containers, 2px for ink rules, 3px for the chapter index's top rule. A dashed border marks a gap (the "Wanted" mark, an empty map cell) or a content-type tag.

#### Named Rules

**The Dashes Carry Meaning Rule.** A dashed outline marks a gap (the "Wanted" tag, an empty map cell) or sets the content-type tag apart from topic tags. Don't use dashes as decoration.

### Components

#### Buttons

- **Shape:** square (0px).
- **Primary:** Starlight's link button, filled with the accent ink (cobalt), text in the stock colour (dark) or white (light), weight 700. The demo run button follows the same fill at 0.5rem 1rem padding.
- **Secondary:** Starlight's minimal link button, text only with an icon; the Space load buttons are 1px ink outlines on the stock, so a page keeps one filled action.
- **Hover / Focus:** a 2px accent outline at 2px offset on every focusable element. Unavailable buttons (`aria-disabled`, which keeps keyboard focus) drop to 50% opacity.

#### Chips (if used)

- **Filter chip:** Archivo 600 at 0.8125rem, 1px gray-5 border, transparent ground, gray-1 text. Pressed (`aria-pressed="true"`) and active-filter pills flip to solid ink on stock.
- **Tag:** read-only, 0.75rem, 1px hairline border, gray-2 text. An IE-field tag carries a small square swatch in its field ink; a content-type tag has a dashed border.
- **Wanted mark:** an inline dashed tag reading "Wanted", gray-3 dashes, gray-2 text. It is the site's one gap mark.

#### Cards / Containers

- **Corner Style:** square.
- **Background:** none; entries are rows on the stock separated by hairlines (1rem padding for literature entries, 0.85rem for applications).
- **Shadow Strategy:** none (see Elevation & Depth).
- **Starlight cards:** no box and no icon; a 3px ink rule on top and the title in Archivo, like the home chapter index.
- **Task lists:** no bullet; one 1rem square box with a 1.5px ink border per item.
- **Border:** demo and embed containers take a 1px border, ink for the zero-shot demo, hairline for embeds. Asides take a 1px border at 45% of their ink over a 9% tint, with no side bar.
- **Internal Padding:** 1rem to 1.1rem.

#### Inputs / Fields

- **Style:** stock ground, ink text, 1px gray-4 border (gray-5 on the sort select), square, Archivo at 0.9375rem.
- **Focus:** the global 2px accent outline.
- **Filter trigger:** a disclosure button (`aria-expanded`) with a CSS-drawn caret that rotates on open (0.15s ease-out). Open: border and text go to full ink. A solid ink count badge shows how many filters are set. One dimension's chips open at a time, in the page flow under the bar, between a 1px ink rule and a hairline; Escape closes them and returns focus to the button.

#### Navigation

- **Sidebar as a thumb index:** chapter entries carry a 1.5rem square number block filled with the chapter ink, numbered by CSS counter. Labels are Archivo 700 at width 88%. The current page gets a 16% tint of its chapter ink and bold ink text; nested lists hang off a hairline.
- **Running head:** see Layout. Its number block uses the same chapter ink.
- **Pagination:** borderless with a 2px ink rule on top.
- **Segmented switch:** the applications explorer's view toggle, a 1px ink frame with ink dividers; the pressed segment is solid ink on stock.

#### Flow plate (Fig. 1)

The signature component. A build-time Sankey of vetted papers, IE field nodes on the left (8-unit bars in the field ink), AI technique nodes on the right (ink bars), bands filled with the source field's ink at `--band-opacity` (0.55 in both themes). Labels are Archivo 650 at width 82%, each the start of its tag's full name (`SHORT_LABELS`, so "Detection" reads as the "Detection & segmentation" chip), with the number of papers in gray-3; band width counts field-technique pairings, and the caption says so. Each band and node is a link to the filtered literature list, and a node's list holds exactly the papers its number counts. Nodes are in the tab order with a 66-unit hit area (at least 24px on a 320px screen); bands are pointer-only (the nodes and the literature filters reach the same lists). Pointing at or focusing a band raises it to 0.9 and drops the others to 0.12 (0.25s, `cubic-bezier(0.16, 1, 0.3, 1)`); keyboard focus draws a 3px accent stroke and underlines the label. Under the plate, a caption over a hairline: bold "Fig. 1", the claim, a "Wanted" mark naming the techniques no paper yet applies to an IE field, and a gray-3 source line.

#### Numbered table with count cells (Table 1.1)

The second system. A ruled table (2px ink rule over the head row, 1px ink rule under the last row, hairline rows; the rules sit on the rows so they match the table's width) titled "Table N.N" in bold. Column heads carry the field swatch. Cells hold a 2.75rem by 1.75rem block shaded by count in cobalt (30%, 45%, solid with on-ink text for 3 and more). On a phone the column heads switch to the short field names, with the full name kept for screen readers; an empty cell is a dashed gray-4 outline. A source line in gray-3 sits below. Markdown tables in content follow the same ruling, with a bold "Table N.N" title above and a source line below, set as `<p class="table-title">` and `<p class="table-src">` so they share Table 1.1's Archivo caption style. Task-list items keep inline markup flowing: the box sits in the label's left margin.

#### Application entries

On the map page each IE field's section holds its synthesis paragraph, then its applications as native disclosures: closed, the name (Archivo 700) over the maturity call (serif, gray-2, 68ch) with a gray-3 caret on the right; open, the description, the tags and the papers link. Each list sits under a field label with the field's swatch and a 2px ink rule. The explorer below the field sections offers the grid (Table 1.1, the default) and the same entries grouped by AI technique.

#### Path figure (Fig. 2)

On the home page, three steps (see, read, try) worked for one map cell, with counts read from the data at build time. Each step is topped by a 3px rule in the ink of the chapter it links to (1, 2, 5), with a gray-3 "Step N", an Archivo 760 verb at width 80%, the chapter's number block and name, and a serif fact in gray-2. A gray-3 chevron in the gap joins the steps on desktop; on phones they stack. Caption as Fig. 1.

#### Chapter index

On the home cover, five columns, each topped by a 3px rule in its chapter ink, with the number block, an Archivo 750 title and a serif gist in gray-2. Hover underlines the title in the chapter ink.

### Do's and Don'ts

#### Do

- **Do** number every figure and table ("Fig. 1", "Table 1.1") and give it a caption and a "Source:" line naming the data file.
- **Do** take colour only from the five inks and the grey ramp, following the Two Jobs Rule.
- **Do** keep every corner square (0px), including on Starlight components you restyle.
- **Do** separate content with rules and hairlines; use the 2px ink rule for heads and table tops.
- **Do** set structure in narrow Archivo and reading text in Source Serif 4 at a 68ch measure.
- **Do** mark gaps with the dashed "Wanted" tag or a dashed empty cell.
- **Do** check every new ink use against 4.5:1 on its theme's ground, in both themes.

#### Don't

- **Don't** build a docs-site hero with a button pair and a card grid.
- **Don't** round corners or add drop shadows, and don't float a panel over content.
- **Don't** use an ink for decoration, or reuse an ink for a meaning other than its chapter and field.
- **Don't** fill an IE-field chip or set field-coloured text; use the square swatch.
- **Don't** use mono outside code.
- **Don't** use dashed borders as decoration; they mean a gap or a content type.
