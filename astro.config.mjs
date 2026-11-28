// @ts-check

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig, fontProviders } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import { IE_TAGS } from "./src/data/tags.ts";
import { lastmod } from "./src/lib/lastmod.ts";
import { cspInlineScripts } from "./src/plugins/csp-inline-scripts.mjs";
import { footprintNumbers } from "./src/plugins/footprint.mjs";
import { rehypeFocusableTables } from "./src/plugins/rehype-focusable-tables.mjs";
import { rehypeTaskListLabels } from "./src/plugins/rehype-task-list-labels.mjs";
import { remarkBaseLinks } from "./src/plugins/remark-base-links.mjs";
import { basePath, repoUrl, site } from "./src/site.ts";

const base = basePath || "/";
// The hash in the URL makes Facebook, Slack, Discord and iMessage, which cache a preview by image URL, refetch a redrawn card.
const ogHash = createHash("sha256").update(readFileSync("public/og.png")).digest("hex").slice(0, 8);
const ogImage = `${site}${basePath}/og.png?v=${ogHash}`;
const ogImageAlt =
  "AI4IE logo and the title Awesome AI for Industrial Ecology: a community-curated guide to using AI in industrial ecology, at ai4ie.org, above a flow diagram that links five industrial ecology fields to the AI techniques papers apply to them.";

// https://astro.build/config
export default defineConfig({
  site,
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

  // Self-hosted variable fonts, subset by scripts/subset-fonts.py to the characters the
  // pages use (src/assets/fonts.test.ts guards that), with no runtime CDN.
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
            src: ["./src/assets/fonts/archivo.woff2"],
            weight: "100 900",
            style: "normal",
            stretch: "72% 100%",
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
            src: ["./src/assets/fonts/source-serif-normal.woff2"],
            weight: "200 900",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/source-serif-italic.woff2"],
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
            src: ["./src/assets/fonts/martian-mono.woff2"],
            weight: "100 800",
            style: "normal",
          },
        ],
      },
    },
  ],

  // GitHub Pages cannot send headers, so the policy is a <meta> tag that Astro writes
  // with a hash for each inline script and style. A meta tag cannot carry
  // frame-ancestors, so on Workers public/_headers sends it; on Pages the site can be framed. The extra sources are the zero-shot demo
  // (transformers.js from jsDelivr, its model files from Hugging Face, an ONNX worker
  // from a blob: URL) and the Hugging Face Space embeds.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "connect-src 'self' blob: data: https://challenges.cloudflare.com https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ https://huggingface.co https://*.huggingface.co https://*.hf.co",
        "frame-src https://*.hf.space https://challenges.cloudflare.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0",
          "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/",
          "'wasm-unsafe-eval'",
          "blob:",
        ],
      },
      // Attribute styles cannot run script; the figures and Starlight set them.
      styleDirective: { resources: [{ resource: "'unsafe-inline'", kind: "attribute" }] },
    },
  },

  // Old URLs that are live on the deployed site must keep working after a move.
  // Astro adds `base` to the route but not to the destination, hence `basePath`.
  redirects: {
    "/hardware/": `${basePath}/tools/local-ai/`,
    "/applications-map/cv-taxonomy/": `${basePath}/demos/cv-taxonomy/`,
    "/best-practices/checklists/": `${basePath}/best-practices/verify/`,
    "/best-practices/agentic-harnesses/": `${basePath}/best-practices/verify/`,
    "/best-practices/evals/": `${basePath}/best-practices/verify/#score-an-ai-step`,
  },

  integrations: [
    cspInlineScripts(), // after Astro writes the policy: hashes the scripts Starlight inlines
    footprintNumbers(), // fills the footprint page: after the CSP hashes it weighs, before Pagefind
    react(), // islands: the literature list, the map explorer and the demos
    // Starlight adds a plain sitemap unless one is configured here. This one dates
    // each URL by its last commit (src/lib/lastmod.ts).
    sitemap({
      serialize: (item) => {
        const path = new URL(item.url).pathname.slice(base.length).replace(/^\/|\/$/g, "");
        const date = lastmod(path);
        return date ? { ...item, lastmod: date } : item;
      },
    }),
    starlight({
      // Fails the build on a broken internal link, a missing heading anchor or a
      // relative link. Content links must be root-absolute so `base` gets added.
      plugins: [starlightLinksValidator()],
      // Search adds paper matches to the Starlight dialog.
      components: {
        Footer: "./src/components/overrides/Footer.astro",
        Head: "./src/components/overrides/Head.astro",
        Hero: "./src/components/overrides/Hero.astro",
        Search: "./src/components/overrides/Search.astro",
        SiteTitle: "./src/components/overrides/SiteTitle.astro",
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
      title: "Awesome AI for Industrial Ecology",
      description:
        "What AI already does in industrial ecology research, how far to trust it, and the papers behind each claim.",
      // Social preview card (public/og.png). Starlight ships no og:image by
      // default, so shared links would otherwise preview as bare text.
      head: [
        {
          tag: "link",
          attrs: {
            rel: "alternate",
            type: "application/rss+xml",
            title: "AI4IE: new literature",
            href: `${basePath}/literature/feed.xml`,
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:image", content: ogImage },
        },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: ogImageAlt } },
        { tag: "meta", attrs: { name: "twitter:image:alt", content: ogImageAlt } },
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
            ...Object.entries(IE_TAGS).map(([tag, label]) => ({
              label,
              slug: `applications-map/${tag}`,
            })),
          ],
        },
        { label: "Literature", slug: "literature" },
        {
          label: "Best practices & guides",
          items: [
            { label: "Getting started & pitfalls", slug: "best-practices" },
            { label: "Verify AI-assisted work", slug: "best-practices/verify" },
            { label: "Prompts & skills", slug: "best-practices/prompts-and-skills" },
          ],
        },
        {
          label: "Tools & courses",
          items: [
            { label: "Software tools", slug: "tools" },
            { label: "Local AI & hardware", slug: "tools/local-ai" },
            { label: "Datasets & models", slug: "tools/data-and-models" },
            { label: "Courses, videos & posts", slug: "tools/learning" },
          ],
        },
        {
          label: "Demos",
          items: [
            { label: "Try a model", slug: "demos" },
            { label: "CV for end-of-life products", slug: "demos/cv-taxonomy" },
          ],
        },
        {
          label: "Community & contribute",
          items: [
            { label: "Contribute & norms poll", slug: "contribute" },
            { label: "Open questions", slug: "open-questions" },
            { label: "Footprint of this site", slug: "footprint" },
          ],
        },
      ],
    }),
  ],
});
