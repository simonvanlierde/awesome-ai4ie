---
title: Privacy
description: What the AI4IE site sends where, what it keeps, and how to ask about it.
---

This page covers [ai4ie.org](https://ai4ie.org), built and maintained by Simon van Lierde.

No cookies, no analytics, no accounts. Your browser stores your theme choice and caches a
demo model after you run it. The web server sees your IP address and browser.

## Search

Keyword search runs in your browser against a downloaded index.

Queries of three or more words go to a Cloudflare Worker and then to Cloudflare Workers AI
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

Suggestion links open a GitHub issue form under GitHub's privacy terms. Links from map gaps
prefill the gap name; the search dialog does not include your query.

## Contributions and norms poll

The [Contribute](/contribute/) page uses two endpoints on the same Cloudflare Worker:

- **Norms poll (`/api/poll`).** Loading the page fetches aggregate vote counts from Cloudflare KV.
  Voting increments only the counts for your selected checks and the total response count; no IP
  address, browser fingerprint, or personal identifier is written to KV. Your browser saves your
  selection in `localStorage` (`ai4ie:norms-poll:v1`) to prevent accidental repeat votes on the
  same device.
- **On-site contribution form (`/api/contribute`).** The form does not ask for or accept an email
  address. Your submission (type, title, details, optional link, and optional attribution) goes to
  the Worker and is posted as a public issue on
  [GitHub](https://github.com/simonvanlierde/awesome-ai4ie/issues) under GitHub's privacy terms.
- **Spam protection and rate limits.** When Turnstile is configured, the form (and optionally the
  poll) loads Cloudflare Turnstile (`challenges.cloudflare.com`) to verify browser submissions
  under Cloudflare's privacy terms. The Worker applies per-IP and location-wide rate limits. As
  with Search, Cloudflare Workers Logs retain request metadata (time, IP address, user agent) for
  up to 7 days.

## Questions

Email [code@duinlab.nl](mailto:code@duinlab.nl) or
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new).

Last reviewed: 21 November 2026.
