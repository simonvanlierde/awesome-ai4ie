import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { buildFeed } from "../../lib/feed";
import { basePath, site } from "../../site";

export const GET: APIRoute = async () => {
  const entries = (await getCollection("literature")).map((e) => e.data);
  return new Response(buildFeed(entries, site + basePath), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
