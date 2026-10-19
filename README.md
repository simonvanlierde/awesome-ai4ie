# Awesome AI for Industrial Ecology

A community-curated guide to using AI in industrial ecology (IE) research. Industrial ecology studies how materials and energy move through the economy: what products are made of, where they end up, and what that costs the environment. The guide has an applications map, a literature list, tool and hardware guidance, working Claude skills, and in-browser demos. It started in the AI4IE working group, and [anyone can contribute](CONTRIBUTING.md). To suggest a paper, a [short form](../../issues/new?template=paper.yml) is enough.

[![Live site](https://img.shields.io/badge/live_site-ai4ie-2148a8)](https://ai4ie.org/)
[![Contributing](https://img.shields.io/badge/contributing-guide-55661a)](CONTRIBUTING.md)
[![Discord](https://img.shields.io/badge/chat-Discord-5865F2?logo=discord&logoColor=white)](https://discord.gg/zhHAZakXHX)
[![CI](https://img.shields.io/github/actions/workflow/status/simonvanlierde/awesome-ai4ie/ci.yml?label=CI)](https://github.com/simonvanlierde/awesome-ai4ie/actions)
[![Coverage](https://img.shields.io/codecov/c/github/simonvanlierde/awesome-ai4ie)](https://codecov.io/gh/simonvanlierde/awesome-ai4ie)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Code: MIT](https://img.shields.io/badge/code-MIT-green)](LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/content-CC--BY--4.0-lightgrey)](LICENSE-CONTENT)

**See it live: [ai4ie.org](https://ai4ie.org/)**

<a href="https://ai4ie.org/">
  <img src=".github/screenshot.png" alt="The AI4IE site homepage" width="800">
</a>

## Quick start

To preview the site, you need Node 26+:

```bash
npm install
npm run dev        # → http://localhost:4321/
npm test
```

The pages are in [`src/content/docs/`](src/content/docs/) and their data is in [`src/data/`](src/data/). To ask a question, join the [AI4IE Discord](https://discord.gg/zhHAZakXHX). Maintainers: see [MAINTAINING.md](MAINTAINING.md).

## License

The code is under the [MIT License](LICENSE). The content is under
[CC BY 4.0](LICENSE-CONTENT): the pages in `src/content/`, the YAML data in `src/data/`,
the skills in `skills/`, and the images in `src/assets/` and `public/`.
