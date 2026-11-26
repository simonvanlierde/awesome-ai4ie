---
title: Privacy
description: What the AI4IE site sends where, what it keeps, and how to ask about it.
---

No cookies, no analytics, no accounts. Your browser stores your theme choice and caches a
demo model after you run it. The web server sees your IP address and browser.

This page covers [ai4ie.org](https://ai4ie.org), built and maintained by Simon van Lierde.

## Search

Keyword search runs in your browser against a downloaded index.

Queries of three or more words go to a small program the site runs on Cloudflare (a
Worker) and then to Cloudflare Workers AI
to find related papers. The site's code does not store your query.

The [MCP server](/literature/#ask-an-ai-assistant) works the same way: `search_papers`
sends the question to the same Worker and Workers AI without storing it. Its other tools
only read the site's static data.

Cloudflare Workers Logs record each request to the Worker (time, IP address, and browser or
AI assistant) for up to 7 days
([Workers Logs limits](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)).

## Demos

Demos load code from jsDelivr and models from Hugging Face only after you start one.
Embedded Hugging Face Spaces are third-party apps that load only when you click them.
Those services then see your IP address and browser under their own privacy terms.

## Suggesting a paper

Suggestion links open the on-site [contribution form](/contribute/), which works as described
under [Contributions and norms poll](#contributions-and-norms-poll). Links from map gaps prefill the gap name; the search dialog does not include your query.

## Contributions and norms poll

The [Contribute](/contribute/) page uses two endpoints on the same Cloudflare Worker:

- **Norms poll.** The Worker stores counts for each check and the total number of votes. It keeps
  no voter records in the poll store. Your browser remembers the checks you selected so you
  do not vote twice by accident. Clear the site's browser storage to remove that selection.
- **Contribution form.** The Worker sends your title, details, optional link and optional
  attribution to GitHub. They appear in a public issue under GitHub's privacy terms. Leave out
  any details you want to keep private.
- **Spam protection.** When the form or poll needs verification, your browser loads Cloudflare
  Turnstile. The Worker sends the verification token and your IP address to Cloudflare to
  check the result. Both limit how often one IP address or one location can send. The Workers Logs
  retention described above also applies to these requests.

## Questions

Email [code@duinlab.nl](mailto:code@duinlab.nl) or
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new).

Last reviewed: 21 November 2026.
