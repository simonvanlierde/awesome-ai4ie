---
title: Datasets & models
description: Open IE datasets, general ML data sources, and where to find pretrained models.
---

Where the data and the models live: open IE datasets first, then the general ML
sources, then pretrained-model registries. Same rules as the rest of the
[tools section](/tools/): each entry is dated and gets a one-line verdict.

## Datasets

**IE data:**

- **[Industrial Ecology Freiburg data commons](https://www.database.industrialecology.uni-freiburg.de)**: open IE datasets (stocks, flows, lifetimes) collected by Stefan Pauliuk's group; the closest thing the field has to a shared data home. *(checked 2026-07)*
- **[EXIOBASE](https://www.exiobase.eu)**: global environmentally-extended MRIO database; free with registration. *(checked 2026-07)*
- **[UNEP IRP Global Material Flows Database](https://www.materialflows.net)**: country-level material extraction, trade, and consumption. Free. *(checked 2026-07)*
- **[ecoinvent](https://ecoinvent.org)**: the standard LCI database. Paid license; check what your institution already has. *(checked 2026-07)*
- **[RELab](https://doi.org/10.5281/zenodo.19703316)**: open platform for collecting product-disassembly data, developed at CML. *(checked 2026-07)*

**General ML dataset sources:**

- **[Hugging Face Datasets](https://huggingface.co/datasets)**: the default host for ML datasets; one `load_dataset()` call away in Python. *(checked 2026-07)*
- **[OpenML](https://www.openml.org)**: curated, uniformly formatted datasets with tasks and benchmark results attached; strong sklearn/mlr integration. *(checked 2026-07)*
- **[Kaggle](https://www.kaggle.com/datasets)**: broad dataset collection plus competitions; quality varies, licenses matter. *(checked 2026-07)*
- **[Zenodo](https://zenodo.org)**: DOI-issuing research repository; where to *publish* your own datasets as much as find others'. *(checked 2026-07)*
- **[UCI ML Repository](https://archive.ics.uci.edu)**: the classic benchmark collection; small, clean, good for baselines. *(checked 2026-07)*

## Pretrained models

Where to find models you can download and run (locally or otherwise):

- **[Hugging Face Hub](https://huggingface.co/models)**: the central registry for pretrained models (LLMs, CV, audio); filter by task, license, and size. Most models on the [applications map](/applications-map/) live here. *(checked 2026-07)*
- **[Ollama library](https://ollama.com/library)**: curated open-weight LLMs packaged for one-command local use; pairs with the [local inference servers](/tools/local-ai/). *(checked 2026-07)*
- **[Kaggle Models](https://www.kaggle.com/models)**: model registry tied to Kaggle's datasets and notebooks. *(checked 2026-07)*
- **[timm](https://huggingface.co/timm)**: the standard collection of pretrained vision backbones for PyTorch. *(checked 2026-07)*

Check the license before building on a model: "open weights" ranges from Apache-2.0 to research-only.
