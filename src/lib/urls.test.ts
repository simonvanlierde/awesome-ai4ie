import { describe, expect, it } from "vitest";
import { BASE, litUrl, siteUrl } from "./urls";

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
