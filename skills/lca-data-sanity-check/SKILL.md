---
name: lca-data-sanity-check
description: Use after an AI-assisted change to an LCA, MFA or input-output data pipeline. Check units, defaults, thresholds and mappings against the original.
---

# LCA / MFA data-pipeline sanity check

## When to apply

- After any AI-assisted change to code that computes impacts, flows, stocks, or
  footprints (Brightway, ODYM, pymrio, pandas pipelines, spreadsheets-as-code).
- Before results from such code go into a paper, report, or dataset release.

## The pass

1. **Read the diff.** Check every changed line against the request. Flag any
   unrelated changes.
2. **Units.** For every quantity the change touches: what unit is it in at each
   step? Look specifically for kg↔t, MJ↔kWh, per-kg↔per-unit, and percent↔fraction
   flips. If the code has no unit annotations, add a comment stating the unit at
   the boundary of the changed code.
3. **Defaults and identifiers.** Did any function default change meaning
   (allocation method, characterization method, database version, region code,
   reference year)? AI models substitute "similar" identifiers, so verify exact
   database/method names against the originals, character for character.
4. **Thresholds and filters.** Did the change add or alter a cutoff, `dropna`,
   filter, or rounding? Quantify what it excludes: row counts before and after.
5. **Mappings.** For any classification/correspondence table the AI wrote or edited
   (e.g. product→material, sector→sector): spot-check entries against the
   authoritative source. Don't trust a generated mapping wholesale.
6. **Known-answer test.** Run the pipeline on a case where the answer is known
   (a published figure, a hand-calculated example, last release's output). If no
   case exists, create a small synthetic case and keep it as a regression test.
7. **Mass/energy balance.** Where applicable, check totals: do inputs still equal
   outputs plus stock change within tolerance? A balance that held before the
   change and fails after it points straight at the bug.

## Output

For each item, report what you checked, how, and the result. Attach the failing
case when something breaks. If everything passes, name the known-answer case you
used. A pass without a named test case doesn't count.
