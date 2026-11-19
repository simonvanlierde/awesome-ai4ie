# Architecture

Last reviewed: 2026-11-19

Awesome AI for Industrial Ecology is a static site built with Astro and Starlight and hosted on GitHub Pages at <https://ai4ie.org/>. A Cloudflare Worker serves the same build plus two read-only endpoints: `POST /api/search` for meaning search and `/mcp` for AI assistants. It runs at `awesome-ai4ie.simonvanlierde.workers.dev` now and takes over ai4ie.org at the cut-over. The site has no database, accounts or analytics.

## Build and runtime flow

```mermaid
flowchart TD
    Data["src/data/*.yaml + citations.json"] --> Schemas["Zod schemas (src/data/schemas.ts)"]
    Docs["src/content/docs/*.md(x)"] --> Astro["Astro + Starlight build"]
    Schemas --> Astro
    Plugins["Remark/Rehype + csp-inline-scripts"] --> Astro
    Astro --> Dist["Static HTML, CSS and JS (dist/)"]
    Dist --> Pages["GitHub Pages (ai4ie.org, HTTPS)"]
    Pages --> Browser["Visitor browser"]
    Dist --> Worker["Cloudflare Worker (worker/)"]
    Worker -->|/api/search, /mcp search_papers| AI["Workers AI (question embedding)"]
    Browser -->|3+ words in search| Worker
    Client["MCP client"] -->|/mcp| Worker
    Browser -->|on click only| CDN["cdn.jsdelivr.net (@huggingface/transformers@4.2.0)"]
    Browser -->|on click only| HF["huggingface.co / hf.co (pinned CLIP commit)"]
```

## Code layout

- `src/data/`: curated YAML data (`literature.yaml`, `applications.yaml`, `resources.yaml`), citation cache (`citations.json`), tag vocabulary (`vocabulary.yaml`, with the labels the code imports in `tags.ts`) and Zod schemas (`schemas.ts`).
- `src/lib/`: pure helpers for citations, RSS feed, URLs, resource lists, Sankey geometry, chapter checks and stall detection.
- `src/components/`: static components (`AppList.tsx`, `TagChips.tsx`, `Resources.astro`), three React islands (`LiteratureBrowser.tsx`, `ApplicationsExplorer.tsx`, `ZeroShotDemo.tsx`) and their filter and pivot helpers.
- `src/plugins/`: Markdown and HTML build plugins, plus `csp-inline-scripts.mjs`.
- `src/content/docs/`: guide pages in Markdown and MDX.
- `worker/`: the Cloudflare Worker: `/api/search`, the MCP server (`mcp.ts`) and the shared search and rate-limit code (`search.ts`).
- `scripts/`: build-time and CI checks (accessibility, licences, citations, page weight and social card).

## Security architecture and assurance case

The site holds no server-side state: the Worker only reads the build's own JSON files. Risk falls at four boundaries:

1. **Repository and build pipeline (`PR -> main -> dist/`).**
   - *Threats:* malicious or malformed data entries, compromised dependencies, workflow injection and leaked secrets.
   - *Countermeasures:* Zod schemas and Vitest check every entry and module, while Biome, `astro check` and CodeQL check the code. `zizmor`, `actionlint`, `betterleaks` and GitHub secret scanning guard workflows and commits. `pnpm-lock.yaml` pins package hashes, workflows pin Actions by commit SHA, and jobs run with minimal permissions.
2. **Static site to visitor browser (`ai4ie.org -> browser`).**
   - *Threats:* cross-site scripting (XSS), script injection and man-in-the-middle tampering.
   - *Countermeasures:* GitHub Pages and `ai4ie.org` enforce HTTPS. Astro writes a Content Security Policy meta tag, and `src/plugins/csp-inline-scripts.mjs` adds SHA-256 hashes for inline scripts. None of the React islands render raw HTML.
3. **Optional in-browser CLIP demo (`ZeroShotDemo.tsx -> external hosts`).**
   - *Threats:* unexpected network traffic, leaking a visitor's photo and upstream model tampering.
   - *Countermeasures:* the demo loads external code and weights only after you pick a photo and click Classify. Your photo stays in browser memory (`URL.createObjectURL`) and never leaves the device. The code pins `@huggingface/transformers@4.2.0` in the CSP and pins `Xenova/clip-vit-base-patch32` to one commit SHA.

4. **Worker endpoints (`/api/search`, `/mcp` -> Workers AI).**
   - *Threats:* spending the Workers AI allowance, cross-site calls from a browser page, and oversized input.
   - *Countermeasures:* both endpoints share one rate limit per IP address (per /64 for IPv6) and cap a question at 300 characters. `/api/search` takes only `application/json`; `/mcp` refuses a browser Origin other than its own host or localhost, and refuses JSON-RPC batches. A failing limiter or model answers "unavailable", never an unmetered call.

### Residual risks and non-goals

- GitHub Pages does not allow custom HTTP response headers, so the site does not send `Strict-Transport-Security` (see [.github/SECURITY.md](.github/SECURITY.md#scope)).
- Embedded Hugging Face Spaces on demo pages run in third-party iframes under Hugging Face's own origin.
