import { describe, expect, it } from "vitest";
import { repoUrl } from "../site";
import { BASE, contentUrl, issueUrl, litUrl, siteUrl } from "./urls";

describe("litUrl", () => {
  it("uses the literature page with optional filters", () => {
    expect(litUrl()).toBe(`${BASE}literature/`);
    expect(litUrl({ ie: ["eol"] })).toBe(`${BASE}literature/?ie=eol`);
  });
});

describe("siteUrl", () => {
  it("resolves site paths against the base and passes full URLs through", () => {
    expect(siteUrl("demos/")).toBe(`${BASE}demos/`);
    expect(siteUrl("/demos/")).toBe(`${BASE}demos/`);
    expect(siteUrl("https://example.org/x")).toBe("https://example.org/x");
  });
});

describe("issueUrl", () => {
  it("opens the named form and encodes prefilled fields", () => {
    expect(issueUrl("paper")).toBe(`${repoUrl}/issues/new?template=paper.yml`);
    expect(issueUrl("paper", { gap: "Chemicals, toxicity & QSAR" })).toBe(
      `${repoUrl}/issues/new?template=paper.yml&gap=Chemicals%2C+toxicity+%26+QSAR`,
    );
  });
});

describe("contentUrl", () => {
  it("turns repo: links into GitHub URLs and resolves the rest against the base", () => {
    expect(contentUrl("repo:blob/main/CONTRIBUTING.md")).toBe(
      `${repoUrl}/blob/main/CONTRIBUTING.md`,
    );
    expect(contentUrl("/applications-map/")).toBe(`${BASE}applications-map/`);
  });
});
