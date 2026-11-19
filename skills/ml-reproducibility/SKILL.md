---
name: ml-reproducibility
description: Use when building, reviewing or writing up a machine-learning model on research data, including LCA, MFA and other industrial ecology datasets. Check for data leakage and gaps in reporting.
---

# ML reproducibility for IE research

These checks follow [Rankin et al. (2026)](https://doi.org/10.21203/rs.3.rs-9270723/v1),
who found data leakage and incomplete reporting in their survey of ML use in
industrial ecology.

## When to apply

- The user is training, tuning, or evaluating any predictive model on research data.
- The user is writing the methods section for a study that used ML.
- The user is reviewing someone else's ML-using manuscript (see reviewer mode).

## Workflow rules (builder mode)

1. **Isolate the test set first.** Split the data before *any* preprocessing.
   Fit normalization, gap-filling, feature selection, and outlier removal on the
   training set only. If the data has a time dimension, split by time
   (time-series cross-validation), never randomly.
2. **Ask whether ML is needed at all.** If the hypothesis can be tested with
   empirical data or a mechanistic model, prefer that.
3. **Fit the simplest model first.** Report a linear-regression (or equivalent)
   baseline before any complex model. If the complex model barely beats it, say so;
   several best-practice studies found linear models nearly as good.
4. **Fill in a model info sheet.** Use Kapoor & Narayanan's model info sheets to
   check the study against known leakage types before writing up.
5. **Describe the pipeline plainly, in order.** The write-up must say things like
   "we split the data, then normalized, then trained". A reader should be able to
   confirm the order of operations from the text alone.
6. **Explain what you can't share.** Give the reason for withholding any data,
   code or model weights. Point readers to comparable data if it exists.
7. **Hunt for assumptions.** Before trusting a good test metric, ask: does the data
   reflect the process being modeled? Are there hidden assumptions (sampling,
   temporal ordering, unit handling) that condition the result? Treat this like the
   sensitivity analysis of an LCA/MFA.

## Reviewer mode

When reviewing an ML-using study, check the three **disqualifying errors** first.
You need no ML expertise to spot them, and any one puts the results in serious
dispute:

- [ ] No hold-out test set at all.
- [ ] Temporal leakage: random splits on time-structured data.
- [ ] Normalization, gap-filling, or feature selection performed *before* the
      train/test split.

Then the softer checks:

- [ ] Is a simple baseline reported alongside the complex model?
- [ ] Is the pipeline order stated plainly in the methods?
- [ ] If data/models are withheld, is the reason stated and reasonable? (Withheld
      data alone is *not* disqualifying when the rest follows best practice.)
- [ ] If you can't tell whether an error is present, that ambiguity is itself a
      finding. Ask for clarification in the revision instead of guessing.

## Output

Report what you checked and what you found. For example, "`split.py` creates
the test set before fitting the scaler."
