// @ts-check

import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import { rehypeTaskListLabels } from "./src/plugins/rehype-task-list-labels.mjs";
import { remarkBaseLinks } from "./src/plugins/remark-base-links.mjs";

// Repo coordinates: the one place to change when forking or renaming.
const owner = "simonvanlierde";
const repo = "awesome-ai4ie";
const repoUrl = `https://github.com/${owner}/${repo}`;
const base = `/${repo}`;
const ogImage = `https://${owner}.github.io/${repo}/og.png`;

// https://astro.build/config
export default defineConfig({
  site: `https://${owner}.github.io`,
  base,

  // Content writes internal links root-absolute (`/tools/`); remarkBaseLinks adds
  // `base` and turns `repo:blob/main/...` links into GitHub URLs.
  // rehypeTaskListLabels names task-list checkboxes for screen readers.
  // Both are remark/rehype plugins, so they need the unified processor rather than
  // Astro's default (Sätteri).
  markdown: {
    processor: unified({
      remarkPlugins: [[remarkBaseLinks, { base, repoUrl }]],
      rehypePlugins: [rehypeTaskListLabels],
    }),
  },

  // Old URLs that are live on the deployed site must keep working after a move.
  // (Astro base-prefixes the route but not the destination, hence `/${repo}`.)
  redirects: { "/hardware/": `${base}/tools/local-ai/` },

  integrations: [
    react(), // enables interactive React "islands" for demos
    starlight({
      // Fails the build on broken internal links / missing heading anchors, and
      // on relative links — content must be root-absolute so `base` gets applied.
      plugins: [starlightLinksValidator()],
      // Show each page's last-git-commit date: signals a living, maintained resource.
      lastUpdated: true,
      favicon: "/favicon.svg",
      // Constructed "AI4IE" wordmark; Starlight swaps the two by theme. The mark
      // replaces the title text in the top bar (title still drives <title>/SEO).
      logo: {
        light: "./src/assets/ai4ie-logo.svg",
        dark: "./src/assets/ai4ie-logo-dark.svg",
        replacesTitle: true,
      },
      title: "Awesome AI for Industrial Ecology",
      description:
        "A community-curated guide to using AI in industrial ecology, open to contributions from anyone.",
      // Social preview card (public/og.png). Starlight ships no og:image by
      // default, so shared links would otherwise preview as bare text.
      head: [
        {
          tag: "meta",
          attrs: { property: "og:image", content: ogImage },
        },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        {
          tag: "meta",
          attrs: { name: "twitter:image", content: ogImage },
        },
      ],
      social: [
        { icon: "github", label: "GitHub", href: repoUrl },
        {
          icon: "discord",
          label: "Discord",
          // TODO: discord admin should make a permanent revokable invite link (or use a vanity link) so this doesn't expire.
          href: "https://discord.gg/zhHAZakXHX",
        },
      ],
      editLink: {
        baseUrl: `${repoUrl}/edit/main/`,
      },
      // Self-hosted variable fonts (no CDN: reproducible, offline-friendly,
      // fits the federated/local-hosting ethos). Weight axis only, both themes.
      customCss: [
        "@fontsource-variable/bricolage-grotesque/wght.css",
        "@fontsource-variable/literata/wght.css",
        "@fontsource-variable/literata/wght-italic.css",
        "@fontsource-variable/martian-mono/wght.css",
        "./src/styles/custom.css",
      ],
      // Sidebar order + labels. Add new pages here (slug = filename without .md).
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Map of AI applications in IE",
          items: [
            { label: "The map", slug: "applications-map" },
            { label: "Worked example: CV taxonomy", slug: "applications-map/cv-taxonomy" },
          ],
        },
        { label: "Literature & resources", slug: "literature" },
        {
          label: "Best practices & guides",
          items: [
            { label: "Getting started & pitfalls", slug: "best-practices" },
            { label: "Verification checklists", slug: "best-practices/checklists" },
            { label: "Prompts & skills", slug: "best-practices/prompts-and-skills" },
          ],
        },
        {
          label: "Tools & hardware",
          items: [
            { label: "Software tools", slug: "tools" },
            { label: "Local AI & hardware", slug: "tools/local-ai" },
            { label: "Datasets & models", slug: "tools/data-and-models" },
          ],
        },
        { label: "Demos", slug: "demos" },
      ],
    }),
  ],
});
