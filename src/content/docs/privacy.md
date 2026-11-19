---
title: Privacy
description: What the AI4IE site sends where, what it keeps, and how to ask about it.
---

This page covers [ai4ie.org](https://ai4ie.org). Simon van Lierde builds the site and is
responsible for this page.

The site sets no cookies and runs no analytics. It has no accounts. Your browser stores your
theme choice and caches the demo model after you run it. The server that sends the pages
sees your IP address and browser.

## Search

Keyword search runs in your browser: it downloads the site's search index and matches your
words on your device.

For searches of three or more words, your browser sends the query to a Cloudflare Worker.
The Worker sends it to Cloudflare Workers AI to find related papers. The site's code does
not store your query.

The site's [MCP server](/literature/#ask-an-ai-assistant), which lets AI assistants search the reading list, works the same way.
When your assistant calls its `search_papers` tool, the question goes to the same Worker and
on to Workers AI, as from the search dialog, and is not stored either. The other tools only
read the site's own data.

Cloudflare's Workers Logs record each request to the Worker: its time, your IP address and
your browser or AI assistant. Cloudflare keeps these logs for at most 7 days
([Workers Logs limits](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)).

## Demos

The demos load code from jsDelivr and models from Hugging Face, and only when you start one.
The embedded Hugging Face Spaces are other people's apps, and they load only when you click
to load them. Those sites then see your IP address and browser, under their own privacy
terms.

## Suggesting a paper

The suggestion links open a form on GitHub under its privacy terms. A link from a gap on
the map can fill in the gap's name. The search dialog opens the form without including
your query.

## Questions

To ask about this page, email [code@duinlab.nl](mailto:code@duinlab.nl) or
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new).

Last reviewed: 19 November 2026.
