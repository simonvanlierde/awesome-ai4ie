---
title: Privacy
description: What the AI4IE site sends where, what it keeps, and how to ask about it.
---

This page covers [ai4ie.org](https://ai4ie.org). Simon van Lierde builds the site and is
responsible for this page.

## In short

The site sets no cookies and runs no analytics. It has no accounts. Your browser stores your
light or dark theme choice, and a demo's model once you run it. Like any website, the server
that sends you the pages sees your IP address and browser. What else goes where depends on
the features below.

## Search

Keyword search runs in your browser: it downloads the site's search index and matches your
words on your device.

Meaning search, which matches a question against the reading list, works differently. When
you type three or more words in the search dialog, your browser sends them to this site's
server, a Cloudflare Worker. The Worker sends the question to Cloudflare Workers AI to turn it
into numbers it can compare, and then returns the closest papers. The site's code does not
store your question.

The site's MCP server, which lets AI assistants search the reading list, works the same way.
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

The "suggest" links open a form on GitHub. Nothing is sent until you submit the issue there,
and then GitHub's privacy terms apply. A suggestion from the search dialog fills in the
question you searched for, which you can edit or delete before you submit.

## Questions

To ask about this page, email [code@duinlab.nl](mailto:code@duinlab.nl) or
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new).

Last reviewed: 19 November 2026.
