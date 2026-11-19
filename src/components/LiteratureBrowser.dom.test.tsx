// @vitest-environment happy-dom
// The browser's behaviour in a DOM: the #<id> link, the Details toggle and the notice for a
// linked paper the filters hide. components.test.tsx covers the server render.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LitEntry } from "../data/schemas";
import LiteratureBrowser from "./LiteratureBrowser";

const entry = (id: string, ie: LitEntry["ie"]): LitEntry => ({
  id,
  title: `Paper ${id}`,
  authors: ["Doe, J."],
  etAl: false,
  year: 2024,
  doi: `10.1000/${id}`,
  ie,
  topic: [],
  ml: ["llm"],
  type: ["method"],
  blurb: "A blurb long enough.",
  added: "2026-01",
});
const ENTRIES = [entry("lcaPaper", ["lca"]), entry("symPaper", ["symbiosis"])];
const HIDDEN = /Doe 2024, is hidden/;
const EXTRAS = { lcaPaper: { apps: [], similar: ["symPaper"] } };

let root: Root;
let host: HTMLElement;
// React warns unless it knows the test drives updates through act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(url: string) {
  history.replaceState(null, "", url);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<LiteratureBrowser entries={ENTRIES} extras={EXTRAS} />));
}
const toggle = (id: string) =>
  document.querySelector<HTMLButtonElement>(`[id="${id}"] .lit-details-toggle`);

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("LiteratureBrowser in a page", () => {
  it("opens, marks and focuses the card a #<id> link names", async () => {
    await mount("/literature/#lcaPaper");
    expect(toggle("lcaPaper")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("lcaPaper-details")).not.toBeNull();
    expect(document.getElementById("lcaPaper")?.hasAttribute("data-target")).toBe(true);
    expect(document.activeElement?.id).toBe("lcaPaper");
    expect(toggle("symPaper")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("writes an opened card's id to the URL and drops it on close", async () => {
    await mount("/literature/?sort=title");
    await act(async () => toggle("symPaper")?.click());
    expect(location.hash).toBe("#symPaper");
    expect(location.search).toBe("?sort=title");
    await act(async () => toggle("symPaper")?.click());
    expect(location.hash).toBe("");
    expect(document.getElementById("symPaper-details")).toBeNull();
  });

  it("follows a Similar link to the other card", async () => {
    await mount("/literature/#lcaPaper");
    act(() => {
      location.hash = "#symPaper";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(toggle("symPaper")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("symPaper")?.hasAttribute("data-target")).toBe(true);
    expect(document.getElementById("lcaPaper")?.hasAttribute("data-target")).toBe(false);
  });

  it("offers to clear filters that hide the linked paper, then shows it", async () => {
    await mount("/literature/?ie=lca#symPaper");
    const notice = document.getElementById("lit-hidden-target");
    expect(notice?.textContent).toMatch(HIDDEN);
    expect(document.activeElement).toBe(notice);
    await act(async () => notice?.querySelector("button")?.click());
    expect(document.getElementById("lit-hidden-target")).toBeNull();
    expect(document.activeElement?.id).toBe("symPaper");
  });

  it("ignores a fragment that names no paper", async () => {
    await mount("/literature/#overview");
    expect(document.querySelector(".lit-details")).toBeNull();
    expect(document.querySelector("[data-target]")).toBeNull();
  });
});
