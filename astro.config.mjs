// @ts-check

import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig, fontProviders } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import { rehypeFocusableTables } from "./src/plugins/rehype-focusable-tables.mjs";
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
  // rehypeTaskListLabels names task-list checkboxes for screen readers;
  // rehypeFocusableTables lets keyboard users scroll a wide table.
  // Both are remark/rehype plugins, so they need the unified processor rather than
  // Astro's default (Sätteri).
  markdown: {
    processor: unified({
      remarkPlugins: [[remarkBaseLinks, { base, repoUrl }]],
      rehypePlugins: [rehypeTaskListLabels, rehypeFocusableTables],
    }),
  },

  // Self-hosted variable fonts, latin subset only, with no runtime CDN.
  // font-display: optional, so a late font never shifts the layout; Head.astro
  // preloads Archivo and the upright serif. Archivo keeps its width axis because
  // titles, tables and tabs are set narrow.
  fonts: [
    {
      name: "Archivo",
      cssVariable: "--font-archivo",
      provider: fontProviders.local(),
      display: "optional",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"],
            weight: "100 900",
            style: "normal",
            stretch: "62% 125%",
          },
        ],
      },
    },
    {
      name: "Source Serif 4",
      cssVariable: "--font-source-serif",
      provider: fontProviders.local(),
      display: "optional",
      fallbacks: ["Georgia", "serif"],
      options: {
        variants: [
          {
            src: [
              "@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
            ],
            weight: "200 900",
            style: "normal",
          },
          {
            src: [
              "@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2",
            ],
            weight: "200 900",
            style: "italic",
          },
        ],
      },
    },
    {
      name: "Martian Mono",
      cssVariable: "--font-martian",
      provider: fontProviders.local(),
      display: "optional",
      fallbacks: ["ui-monospace", "monospace"],
      options: {
        variants: [
          {
            src: ["@fontsource-variable/martian-mono/files/martian-mono-latin-wght-normal.woff2"],
            weight: "100 800",
            style: "normal",
          },
        ],
      },
    },
  ],

  // Old URLs that are live on the deployed site must keep working after a move.
  // Astro adds `base` to the route but not to the destination, hence `${base}`.
  redirects: { "/hardware/": `${base}/tools/local-ai/` },

  integrations: [
    react(), // islands: the literature list, the map explorer and the demos
    starlight({
      // Fails the build on a broken internal link, a missing heading anchor or a
      // relative link. Content links must be root-absolute so `base` gets added.
      plugins: [starlightLinksValidator()],
      // Head adds the fonts, Hero is the home cover (title beside Fig. 1), and
      // PageTitle adds the running head above each title.
      components: {
        Head: "./src/components/overrides/Head.astro",
        Hero: "./src/components/overrides/Hero.astro",
        PageTitle: "./src/components/overrides/PageTitle.astro",
      },
      // Each page shows the date of its last commit, so readers can see how current it is.
      lastUpdated: true,
      // Wrap long lines: most blocks are prompts to copy, and a block that
      // scrolls sideways must also be reachable by keyboard (axe).
      expressiveCode: {
        defaultProps: { wrap: true },
        // Martian Mono runs wide, so the default size lands under 12px.
        styleOverrides: { codeFontSize: "0.8125rem" },
      },
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
          // TODO: this invite can expire. A Discord admin should replace it with a
          // permanent, revocable invite or a vanity link.
          href: "https://discord.gg/zhHAZakXHX",
        },
      ],
      editLink: {
        baseUrl: `${repoUrl}/edit/main/`,
      },
      customCss: ["./src/styles/custom.css"],
      // Sidebar order + labels. Add new pages here (slug = filename without .md).
      // A new top-level entry is a new chapter: it also needs an entry in
      // src/lib/chapters.ts and an ink in custom.css (chapters.test.ts checks both).
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Map of AI applications",
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
