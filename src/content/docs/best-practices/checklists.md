---
title: Verification checklists
description: Checklists for AI-assisted coding and ML reproducibility, drawn from documented failure modes in IE research.
---

## AI-assisted coding

- [ ] Did I read the actual diff, not just skim the chat summary of what changed?
- [ ] Are units, defaults, and thresholds still what I intended, not silently changed?
- [ ] Does every imported package/function actually exist and do what the AI claims?
- [ ] Did I run it on a case with a known answer, not just "it executed without error"?
- [ ] If a coding agent ran the work, were golden tests protected so the agent could not edit them?
- [ ] Did I verify cited claims against the primary source, not only that the DOI resolves?
- [ ] If I didn't fully understand a change, did I ask the AI to explain it before accepting it?

For setting up protected golden tests, a short `AGENTS.md`, a claim ledger, and a run log, see [Agentic harnesses & verification](/best-practices/agentic-harnesses/).

## Machine learning reproducibility

A preprint review of 50 ML studies in industrial ecology found computational
reproducibility problems in 42 and clear data leakage in 14 ([Rankin et al.](https://doi.org/10.21203/rs.3.rs-9270723/v1)).

- [ ] Is the test set isolated *before* any pre-processing, normalization, or gap-filling?
- [ ] If the data has a time dimension, was splitting done in a way that avoids temporal leakage
      (e.g. time-series cross-validation, not a random split)?
- [ ] Does the write-up plainly describe the pipeline steps in order (e.g. "we split the data,
      then normalized, then trained"), not just the model architecture?
- [ ] Is there a simple baseline (e.g. linear regression) reported alongside any complex model?
- [ ] Is ML actually needed here, or could the hypothesis be tested with empirical data instead?
- [ ] If data, code, or a model is withheld, is the reason stated (e.g. proprietary data), and is
      there a pointer to how similar data could be obtained?
- [ ] If an LLM was used in the modeling workflow itself (not just for coding), are its training
      data cutoff and provenance discussed as a possible source of test-set leakage?

:::note[For reviewers]
Check for a missing hold-out test set, time leakage, and preprocessing before the
split. If the authors withheld data, look for the reason and what you can still
verify.
:::

The [`ml-reproducibility` skill](/best-practices/prompts-and-skills/#ml-reproducibility)
lets a supported assistant apply this checklist to a pipeline.
