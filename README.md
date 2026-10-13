# Awesome AI for Industrial Ecology

A community-curated resource for using AI in industrial ecology (IE) research. It started in the AI4IE working group, and [anyone can contribute](CONTRIBUTING.md).

[![Live site](https://img.shields.io/badge/live_site-ai4ie-c2410c)](https://simonvanlierde.github.io/awesome-ai4ie/)
[![Contributing](https://img.shields.io/badge/contributing-guide-0f766e)](CONTRIBUTING.md)
[![Discord](https://img.shields.io/badge/chat-Discord-5865F2?logo=discord&logoColor=white)](https://discord.gg/zhHAZakXHX)
[![CI](https://img.shields.io/github/actions/workflow/status/simonvanlierde/awesome-ai4ie/ci.yml?label=CI)](https://github.com/simonvanlierde/awesome-ai4ie/actions)
[![Coverage](https://img.shields.io/codecov/c/github/simonvanlierde/awesome-ai4ie)](https://codecov.io/gh/simonvanlierde/awesome-ai4ie)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Code: MIT](https://img.shields.io/badge/code-MIT-green)](LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/content-CC--BY--4.0-lightgrey)](LICENSE-CONTENT)

**See it live: [simonvanlierde.github.io/awesome-ai4ie](https://simonvanlierde.github.io/awesome-ai4ie/)**

<a href="https://simonvanlierde.github.io/awesome-ai4ie/">
  <img src=".github/screenshot.png" alt="The AI4IE site homepage" width="800">
</a>

## What this is

This repo is a proposal, not a finished resource. It's for the AI4IE working group and
for anyone else who works where AI and IE meet. Each section already has real content to react to: an applications map, a literature list, tool and hardware guidance, working Claude skills, and in-browser demos. To change or add something, open a pull request. If you'd rather discuss it first, open an issue.

| Page | Contents |
| --- | --- |
| [Best practices & guides](src/content/docs/best-practices/) | Getting started and pitfalls, verification checklists, prompts and Claude skills. |
| [Tools & hardware](src/content/docs/tools/) | Software tools, local AI and hardware, datasets and models. |
| [Map of AI in IE](src/content/docs/applications-map/index.mdx) | A two-dimensional map of AI applications by IE field and AI technique. |
| [Literature & resources](src/content/docs/literature.mdx) | Tag-filterable reading list backed by `src/data/literature.yaml`. |
| [Demos](src/content/docs/demos.mdx) | In-browser (transformers.js) and embedded demos, tied to map cells. |

## Contributing

Add a paper or application to a YAML file under `src/data/`, or edit a Markdown page under `src/content/docs/`, then open a pull request. You don't need a local setup to edit text. See [CONTRIBUTING.md](CONTRIBUTING.md).

## How it's built

The site uses [Astro](https://astro.build) and the [Starlight](https://starlight.astro.build) docs theme. Pages are plain Markdown or MDX. The interactive demos are **Astro islands**: components that load their own JavaScript, so a page without one ships no JavaScript at all. A push to `main` builds the site and deploys it to GitHub Pages.

| Where | What |
| --- | --- |
| `src/content/docs/*.md` | Page content (`.mdx` when a page embeds a component). |
| [`astro.config.mjs`](astro.config.mjs) | Sidebar, theme, site config. |
| [`src/styles/custom.css`](src/styles/custom.css) | Brand colors. |
| [`src/components/ZeroShotDemo.tsx`](src/components/ZeroShotDemo.tsx) | In-browser CLIP demo island (transformers.js). |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, test, build, deploy. |

Preview locally (needs Node 26+):

```bash
npm install
npm run dev        # → http://localhost:4321/awesome-ai4ie/
```

## License

The code is under the [MIT License](LICENSE). The content is under
[CC BY 4.0](LICENSE-CONTENT): the pages in `src/content/`, the YAML data in `src/data/`,
the skills in `skills/`, and the images in `src/assets/` and `public/`.
