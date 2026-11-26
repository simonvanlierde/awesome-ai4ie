---
title: Footprint of this site
description: The carbon footprint of one page view of this site and of one demo run, as a small life cycle assessment.
---

Every number, table and figure on this page comes from this build. None is typed by hand.

## Result

One page view of this site transfers about %%fp:viewKb%% kB and emits **%%fp:view%%** CO₂e.
A thousand page views emit %%fp:thousandViews%%.

One zero-shot demo run downloads about %%fp:demoMb%% MB and emits **%%fp:demo%%** CO₂e. One
demo run weighs as much as about %%fp:viewsPerDemo%% page views.

<figure class="fp-figure not-content">
%%fp:compareFigure%%
<figcaption>

**Fig. 4** Grams of CO₂e for one page view, 1,000 page views and one demo run, on one linear
scale. At this scale one page view is a hairline. Dark <span class="fp-key" aria-hidden="true"></span>:
the estimate for a green host. Light <span class="fp-key fp-key--high" aria-hidden="true"></span>:
what a host that is not green adds.
Source: [`src/lib/footprint.mjs`](repo:blob/main/src/lib/footprint.mjs) on this build's page weights.

</figcaption>
</figure>

<p class="table-title"><b>Table 6.1</b> The footprint per functional unit</p>

| Functional unit | Data transferred | CO₂e, green host to other host |
| --- | --- | --- |
| One page view | %%fp:viewKb%% kB | %%fp:view%% |
| 1,000 page views | %%fp:thousandMb%% MB | %%fp:thousandViews%% |
| One demo run | %%fp:demoMb%% MB | %%fp:demo%% |

<p class="table-src">Source: <code>scripts/page-weight.mjs</code> on this build, and the demo's file listings.</p>

The page view is the mean of all %%fp:pages%% pages, which weigh %%fp:minKb%% to %%fp:maxKb%% kB.
Most of them weigh about the same, because they share the fonts, styles and scripts. The
pages with an interactive list, map or demo load React and weigh more (Fig. 5).

<figure class="fp-figure not-content">
%%fp:pageFigure%%
<figcaption>

**Fig. 5** First-visit weight of every page, heaviest first, and its CO₂e per view. The tick
marks the page's budget; CI fails a page that passes it. Source:
[`scripts/page-weight.mjs`](repo:blob/main/scripts/page-weight.mjs) on this build.

</figcaption>
</figure>

## Functional unit

One page view: one reader loading one page with an empty cache.

The demo run is a second unit. It is one press of Classify in the zero-shot demo, with an empty
cache. The browser then keeps the model, so later runs download nothing.

## Foreground and background

The foreground is what this site decides: how many bytes a page sends, what the demo
downloads, and where the site is hosted. The background is everything those bytes pass
through: data centres, networks, the reader's device and the electricity grid. This page
measures the foreground and takes the background from the
[Sustainable Web Design model](https://sustainablewebdesign.org/estimating-digital-emissions/),
version 4, through the [CO2.js](https://developers.thegreenwebfoundation.org/co2js/overview/)
library (`@tgwf/co2` 0.19.0).

<p class="table-title"><b>Table 6.2</b> Inventory per functional unit</p>

| Flow | Amount | Source |
| --- | --- | --- |
| **Foreground** | | |
| Page data, one view | %%fp:viewKb%% kB | `scripts/page-weight.mjs`, mean over pages |
| Demo download, one run | %%fp:demoMb%% MB | file listings on Hugging Face and jsDelivr |
| Hosting | Cloudflare, counted as green and as not green | both ends of the model's green-host switch |
| **Background, per GB transferred** | | |
| Data centre | %%fp:dataCentreGb%% | SWD v4; the low end is for a green host |
| Network | %%fp:networkGb%% | SWD v4 |
| Reader's device | %%fp:deviceGb%% | SWD v4 |
| Total | %%fp:totalGb%% | SWD v4 |
| Grid electricity | %%fp:gridIntensity%% g CO₂e/kWh | SWD v4, world average |

<p class="table-src">Source: <code>src/lib/footprint.mjs</code>, which reads the background rows from CO2.js.</p>

Each background row includes the embodied emissions of the equipment. The reader's device
carries %%fp:deviceShare%% of the total for a host that is not green: the model assigns most of
the footprint to the screen, not the server.

Outside the boundary:

- **CI builds.** A build is a short job on one CI runner, spread over every view until the next
  change. I have not measured it.
- **Computing on the reader's device.** The model counts the device's energy per gigabyte
  received, not the energy of running the demo's model.
- **Search, the author's devices and the Hugging Face Spaces.** Search runs on Workers AI and
  only for queries of three or more words. Other people run the Spaces.
- **Returning visitors.** They download less, so the result is an upper bound for them.

## What the demo downloads

The demo loads [transformers.js](https://huggingface.co/docs/transformers.js) from jsDelivr
and the CLIP model `Xenova/clip-vit-base-patch32` from Hugging Face, at a pinned revision. The
browser uses the quantized ONNX file (%%fp:onnxMb%% MB). With the tokenizer files, transformers.js and
its wasm runtime, the total is %%fp:demoMb%% MB, uncompressed. I read the sizes from the file
listings on 2026-11-26. These files are not in the page budget, because they load only when
a reader presses Classify.

## Uncertainty

- **The model is top-down.** It spreads the energy of the whole internet over all bytes.
  It is made for comparing and for rough totals. It cannot say which part of this site
  causes the emissions, and I give no error bar for the model itself. Read the figures as
  orders of magnitude.
- **Hosting.** The site runs on Cloudflare. The ranges show the two ends: with the
  green-host adjustment for the data centre, and without it.
- **Grid intensity.** The model uses a world average. Readers on cleaner or dirtier grids
  get less or more.
- **Gzip.** Page weight is the gzipped size, a proxy for bytes on the wire. Cloudflare may
  send Brotli, which is smaller.
- **Demo files.** The sizes are fixed in the code and I update them by hand when the demo's
  model or library version changes. The sizes are uncompressed and the wasm runtime is the
  largest variant, so the demo total is an upper bound.
- **Embodied emissions.** These come from the model's constants. I did not check them.

## Check your own site

You can run the same estimate on your own site. For one page, open your browser's developer
tools, turn off the cache, reload, and read the bytes transferred from the Network tab. Then,
in a folder with `@tgwf/co2` installed:

```js
import { co2 } from "@tgwf/co2";

const swd = new co2({ model: "swd", version: 4 });
const bytes = 180 * 1024; // the bytes transferred
console.log(swd.perByte(bytes, false), "g CO2e per view"); // true for a green host
```

For every page of a built site, copy [`scripts/page-weight.mjs`](repo:blob/main/scripts/page-weight.mjs)
into your repo. Change its `basePath` import to your site's base path (`""` at a domain's root),
and its budgets to yours. Then add a script next to it:

```js
// carbon.mjs: the weight and CO2e of each page in dist/
import { co2 } from "@tgwf/co2";
import { weighAll } from "./page-weight.mjs";

const swd = new co2({ model: "swd", version: 4 });
for (const { page, kb } of await weighAll("dist")) {
  const mg = swd.perByte(kb * 1024, false) * 1000;
  console.log(`${page}: ${kb.toFixed(0)} KB, ${mg.toFixed(0)} mg CO2e`);
}
```

In GitHub Actions, run both after your build step. `page-weight.mjs` fails the job when a page
passes its budget:

```yaml
- run: node scripts/page-weight.mjs
- run: node scripts/carbon.mjs
```

Without code, [Website Carbon](https://www.websitecarbon.com/) estimates one page from its
URL, and the Green Web Foundation's [Green Web Check](https://www.thegreenwebfoundation.org/green-web-check/)
tells you whether your host runs on green energy. CO2.js's
[methods](https://developers.thegreenwebfoundation.org/co2js/methods/) page lists the other
options, such as other grid intensities.
