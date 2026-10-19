---
title: Software tools
description: Assistants, coding assistants, research tools, and libraries for AI-assisted IE work.
---

Software worth knowing for AI-assisted IE work. Two sibling pages cover
[running models locally and hardware](/tools/local-ai/) and
[where to find datasets and pretrained models](/tools/data-and-models/).

Tools change fast, so every entry carries the date it was last checked. If you spot a
stale line, fixing it is a one-line pull request.

**Entry format:** name + link, one line on what it does, *good for / not for*,
free/paid, and whether data leaves your machine (this matters for confidential
industry data and for anything under an NDA or a data-management plan).

## Assistants and chat interfaces

- **[Claude](https://claude.ai)**: general assistant; strong at long-document analysis, writing, and code. *Good for:* working through a paper or dataset description, drafting, code explanation. *Not for:* facts without verification; check citations before using them (see [Best practices](/best-practices/)). Free tier + paid. **Data leaves your machine.** *(checked 2026-07)*
- **[ChatGPT](https://chatgpt.com)**: general assistant with the largest ecosystem (data analysis, custom GPTs). *Good for:* exploratory data analysis on non-sensitive CSVs, brainstorming. *Not for:* anything confidential on the free tier. Free tier + paid. **Data leaves your machine.** *(checked 2026-07)*
- **[Le Chat (Mistral)](https://chat.mistral.ai)**: assistant from an EU provider, with EU hosting options. *Good for:* work that requires EU data residency. *Not for:* matching the frontier models on hard reasoning. Free tier + paid. **Data leaves your machine.** *(checked 2026-07)*
- **Everything else**: the assistant landscape shifts monthly. For a current view, [LMArena](https://lmarena.ai) ranks models by blind community votes, and [Artificial Analysis](https://artificialanalysis.ai) tracks quality, price, and speed across providers. *(checked 2026-07)*
- **Local chat front-ends** (Open WebUI, LM Studio's chat, Ollama's app): chat UI over models running on your own hardware; see [Local AI & hardware](/tools/local-ai/). **Data stays on your machine.** *(checked 2026-07)*

## Coding assistants

- **[Claude Code](https://docs.claude.com/en/docs/claude-code)**: agentic coding in the terminal/IDE: reads the repo, edits files, runs tests. *Good for:* multi-file changes, test-driven work, cleaning up research code. *Not for:* unreviewed use; read the diffs (see the [coding checklist](/best-practices/checklists/#ai-assisted-coding)). Paid. **Code leaves your machine.** *(checked 2026-07)*
- **[GitHub Copilot](https://github.com/features/copilot)**: inline completions and chat in the editor; free for verified academics via GitHub Education. *Good for:* boilerplate, tests, docstrings while you type. *Not for:* large refactors. Free (edu) / paid. **Code leaves your machine.** *(checked 2026-07)*
- **[Aider](https://aider.chat)**: open-source terminal pair-programmer that can run against local models. *Good for:* AI-assisted coding on code you can't send to a cloud service (point it at an Ollama/vLLM endpoint). *Not for:* the polish of the commercial tools. Free (bring your own model/API). **Can stay fully local.** *(checked 2026-07)*

## Research and literature

- **[Zotero](https://www.zotero.org)**: open-source reference manager. Add [Better BibTeX](https://retorque.re/zotero-better-bibtex/) for stable citation keys. AI integrations exist as plugins. *Good for:* holding the references you have verified. Add an AI-suggested citation only after you check it. Free. **Local-first** (sync optional). *(checked 2026-07)*
- **[Semantic Scholar](https://www.semanticscholar.org)**: free scholarly search with a citation graph and a good API. *Good for:* checking whether a paper an AI cited actually exists. Free. *(checked 2026-07)*
- **[Connected Papers](https://www.connectedpapers.com)**: visual citation-graph exploration from a seed paper. *Good for:* getting into an unfamiliar literature quickly. Free tier + paid. *(checked 2026-07)*
- **[Elicit](https://elicit.com)**: LLM-assisted literature search and structured data extraction from papers. *Good for:* first-pass screening and extraction tables. *Not for:* unverified extractions; spot-check them against the PDFs. Free tier + paid. **Data leaves your machine.** *(checked 2026-07)*
- **[NotebookLM](https://notebooklm.google.com)**: grounded Q&A over documents you upload; answers cite the sources. *Good for:* interrogating a pile of reports or EPDs. *Not for:* confidential documents. Free. **Data leaves your machine.** *(checked 2026-07)*

## Data and modeling libraries

Python packages relevant to AI + IE work:

- **[Brightway](https://docs.brightway.dev)**: open LCA framework; the computational backbone for scripted, reproducible LCA. *(checked 2026-07)*
- **[Activity Browser](https://github.com/LCA-ActivityBrowser/activity-browser)**: GUI on top of Brightway, developed at CML, Leiden University. *Good for:* Brightway workflows without writing code. *(checked 2026-07)*
- **[premise](https://github.com/polca/premise)**: prospective LCA databases coupling ecoinvent with IAM scenarios. *(checked 2026-07)*
- **[ODYM](https://github.com/IndEcol/ODYM)**: dynamic MFA framework. *(checked 2026-07)*
- **[pymrio](https://github.com/IndEcol/pymrio)**: environmentally-extended multi-regional input–output analysis. *(checked 2026-07)*
- **[scikit-learn](https://scikit-learn.org)**: classical ML. *Start here:* fitting a linear baseline before any deep model is one of the [ML-reproducibility recommendations](/best-practices/checklists/#machine-learning-reproducibility). *(checked 2026-07)*
- **[PyTorch](https://pytorch.org)**: the default deep-learning framework in research; most CV/NLP models on the [map](/applications-map/) ship as PyTorch weights. *(checked 2026-07)*
