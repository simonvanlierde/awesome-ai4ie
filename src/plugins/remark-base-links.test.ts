import { describe, expect, it } from "vitest";
import { remarkBaseLinks } from "./remark-base-links.mjs";

const repoUrl = "https://github.com/owner/repo";
const transform = remarkBaseLinks({ base: "/repo/", repoUrl });

/** Run the plugin over a paragraph of links and return their rewritten URLs. */
function rewrite(...urls: string[]) {
  const links = urls.map((url) => ({ type: "link", url, children: [] }));
  transform({ type: "root", children: [{ type: "paragraph", children: links }] });
  return links.map((link) => link.url);
}

describe("remarkBaseLinks", () => {
  it("prefixes root-absolute links with the base", () => {
    expect(rewrite("/tools/", "/")).toEqual(["/repo/tools/", "/repo/"]);
  });
  it("leaves links that already carry the base alone", () => {
    expect(rewrite("/repo/tools/", "/repo")).toEqual(["/repo/tools/", "/repo"]);
  });
  it("turns repo: links into repo URLs", () => {
    expect(rewrite("repo:blob/main/CONTRIBUTING.md#skills", "repo:tree/main/skills")).toEqual([
      `${repoUrl}/blob/main/CONTRIBUTING.md#skills`,
      `${repoUrl}/tree/main/skills`,
    ]);
  });
  it("leaves external and relative links alone", () => {
    expect(rewrite("https://example.org/", "#anchor", "../x/")).toEqual([
      "https://example.org/",
      "#anchor",
      "../x/",
    ]);
  });
});
