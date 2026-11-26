import { describe, expect, it } from "vitest";
import { repoUrl } from "../site";
import { BASE, contentUrl, contributeUrl, litUrl, paperUrl, siteUrl } from "./urls";

describe("litUrl", () => {
  it("uses the literature page with optional filters", () => {
    expect(litUrl()).toBe(`${BASE}literature/`);
    expect(litUrl({ ie: ["circular"] })).toBe(`${BASE}literature/?ie=circular`);
  });
});

describe("siteUrl", () => {
  it("resolves site paths against the base and passes full URLs through", () => {
    expect(siteUrl("demos/")).toBe(`${BASE}demos/`);
    expect(siteUrl("/demos/")).toBe(`${BASE}demos/`);
    expect(siteUrl("https://example.org/x")).toBe("https://example.org/x");
    expect(siteUrl(`${BASE}demos/`)).toBe(`${BASE}demos/`);
  });
});

describe("contributeUrl", () => {
  it("opens the form on the given type and encodes prefilled fields", () => {
    expect(contributeUrl("other")).toBe(`${BASE}contribute/?type=other#send-a-contribution`);
    expect(contributeUrl("resource", { details: "Gap: Chemicals, toxicity & QSAR" })).toBe(
      `${BASE}contribute/?type=resource&details=Gap%3A+Chemicals%2C+toxicity+%26+QSAR#send-a-contribution`,
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

describe("paperUrl", () => {
  it("links a paper's card on the reading list", () => {
    expect(paperUrl("preuss2024")).toBe(`${BASE}literature/#preuss2024`);
  });
});
