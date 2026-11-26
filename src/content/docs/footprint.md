---
title: Footprint of this site
description: Draft. The carbon footprint of one page view of this site, and of one demo run, as a small life cycle assessment.
pagefind: false
head:
  - tag: meta
    attrs: { name: robots, content: noindex }
---

**Draft.** The group has not seen this page yet, and nothing links to it. Every number below is
computed from this build, not typed by hand.

## Result

One page view of this site transfers about %%fp:viewKb%% KB and emits **%%fp:view%%** CO2e.
A thousand page views emit %%fp:thousandViews%%.

One zero-shot demo run downloads about %%fp:demoMb%% MB and emits **%%fp:demo%%** CO2e.
That equals about %%fp:viewsPerDemo%% page views.

%%fp:verdict%%

The first number of each pair is for a green host, the second for a host that is not. See
[uncertainty](#uncertainty).

## Method

I estimate emissions from data transferred, with the Sustainable Web Design model, version 4
([model docs](https://sustainablewebdesign.org/estimating-digital-emissions/)). It splits
each gigabyte into the energy of data centres, networks and the reader's device, each with
its embodied part, and multiplies by the global average grid intensity (494 g CO2e/kWh). The
[CO2.js](https://developers.thegreenwebfoundation.org/co2js/overview/) library from the Green
Web Foundation (`@tgwf/co2`, version 0.19.0, Apache-2.0) implements it. The code is in
[`src/lib/footprint.mjs`](repo:blob/main/src/lib/footprint.mjs).

Page weight is what `scripts/page-weight.mjs` measures on the built site: the gzipped HTML plus
the same-origin files the page loads on a first visit. The same script fails CI when a page
passes its budget.
Each build measures all %%fp:pages%% pages and averages them. The mean is the page view here;
the pages range from %%fp:minKb%% to %%fp:maxKb%% KB.

## Functional unit

One page view: one reader loading one page with an empty cache.

The demo run is a second unit. It is one press of Classify in the zero-shot demo, with an empty
cache. The browser then keeps the model, so later runs download nothing.

## Boundary

In:

- data transfer from the host to the reader's browser
- hosting, as the data-centre share of that transfer
- the reader's device, only for the energy per gigabyte that the model assigns to it

Out:

- the build and CI: a build is a short job on one CI runner, spread over every view until the
  next change; I have not measured it
- the demo's computing on the reader's device, and the energy of running the models
- search (Workers AI, only for queries of three or more words), the author's devices, and the
  Hugging Face Spaces, which other people run
- returning visitors, who download less. The result is an upper bound for them.

## What the demo downloads

The demo loads [transformers.js](https://huggingface.co/docs/transformers.js) from jsDelivr
and the CLIP model `Xenova/clip-vit-base-patch32` from Hugging Face, at a pinned revision. The
browser uses the quantized ONNX file (%%fp:onnxMb%% MB). With the tokenizer files, transformers.js and
its wasm runtime, the total is %%fp:demoMb%% MB. I read the sizes from the file listings
on 2026-11-26. Cross-origin files are not in the page-weight budget, because they load only on a click.

## Uncertainty

- **The model is top-down.** It spreads the energy of the whole internet over all bytes.
  It is made for comparing and for rough totals. It cannot say which part of this site
  causes the emissions, and I give no error bar for the model itself. Read the figures as
  orders of magnitude.
- **Hosting.** The site runs on Cloudflare. The range above shows the two ends: with the
  green-hosting adjustment for the data centre, and without it.
- **Grid intensity.** The model uses a world average. Readers on cleaner or dirtier grids
  get less or more.
- **Gzip.** Page weight is the gzipped size, a proxy for bytes on the wire. Cloudflare may
  send Brotli, which is smaller.
- **Demo files.** The sizes are fixed in the code and I update them by hand when the demo's
  model or library version changes. The wasm runtime is the largest variant, so the demo
  total is an upper bound.
- **Embodied emissions.** These come from the model's constants. I did not check them.
