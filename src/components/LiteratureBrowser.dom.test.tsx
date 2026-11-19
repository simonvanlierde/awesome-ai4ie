// @vitest-environment happy-dom
// The browser's behaviour in a DOM: the #<id> link, the Details toggle and the notice for a
// linked paper the filters hide. components.test.tsx covers the server render.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LitEntry } from "../data/schemas";
import { tagLabel } from "../data/tags";
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
const marked = (id: string) => document.getElementById(id)?.hasAttribute("data-target");
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement)?.click());
// Turn the IE field filter for `tag` on or off through the facet panel.
async function pickField(tag: "lca" | "symbiosis") {
  await click(document.querySelector(".lit-facet-trigger"));
  const chip = [...document.querySelectorAll(".lit-chip")].find(
    (c) => c.textContent === tagLabel("ie", tag),
  );
  await click(chip);
}

// happy-dom fires hashchange after history.replaceState, which browsers never do (HTML
// spec, "URL and history update steps"). Drop its events; tests send their own as `linked`.
const LINKED = { oldURL: "linked" };
const dropReplaceStateEvents = (e: Event) => {
  if ((e as HashChangeEvent).oldURL !== LINKED.oldURL) e.stopImmediatePropagation();
};
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.addEventListener("hashchange", dropReplaceStateEvents, { capture: true });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  window.removeEventListener("hashchange", dropReplaceStateEvents, { capture: true });
});

describe("LiteratureBrowser in a page", () => {
  it("opens, marks and focuses the card a #<id> link names", async () => {
    await mount("/literature/#lcaPaper");
    expect(toggle("lcaPaper")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("lcaPaper-details")).not.toBeNull();
    expect(document.getElementById("lcaPaper")?.hasAttribute("data-target")).toBe(true);
    expect(document.activeElement?.id).toBe("lcaPaper");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(toggle("symPaper")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("writes an opened card's id to the URL and drops it on close", async () => {
    await mount("/literature/?sort=title");
    await click(toggle("symPaper"));
    expect(location.hash).toBe("#symPaper");
    expect(location.search).toBe("?sort=title");
    // Only a link marks a card; opening it on the page does not.
    expect(marked("symPaper")).toBe(false);
    await click(toggle("symPaper"));
    expect(location.hash).toBe("");
    expect(document.getElementById("symPaper-details")).toBeNull();
  });

  it("hands the fragment to the last card still open when its card closes", async () => {
    await mount("/literature/");
    await click(toggle("lcaPaper"));
    await click(toggle("symPaper"));
    await click(toggle("lcaPaper"));
    expect(location.hash).toBe("#symPaper");
    await click(toggle("lcaPaper"));
    await click(toggle("lcaPaper"));
    expect(location.hash).toBe("#symPaper");
    await click(toggle("symPaper"));
    expect(location.hash).toBe("");
  });

  it("keeps the fragment when the filters change", async () => {
    await mount("/literature/");
    await click(toggle("symPaper"));
    await pickField("symbiosis");
    expect(location.search).toBe("?ie=symbiosis");
    expect(location.hash).toBe("#symPaper");
  });

  it("shows no notice for a card that was only opened on the page", async () => {
    await mount("/literature/");
    await click(toggle("symPaper"));
    await pickField("lca");
    expect(document.getElementById("symPaper")).toBeNull();
    expect(document.getElementById("lit-hidden-target")).toBeNull();
  });

  it("says on screen whether the link was copied, and shows it when copying fails", async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await mount("/literature/#lcaPaper");
    const copy = [...document.querySelectorAll("#lcaPaper-details button")].find(
      (b) => b.textContent === "Copy link",
    );
    const status = () => copy?.parentElement?.querySelector("[aria-live]")?.textContent;
    await click(copy);
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/literature/#lcaPaper`);
    expect(status()).toBe("Copied");
    await click(copy);
    expect(status()).toBe(`Copying failed. The link is ${location.origin}/literature/#lcaPaper`);
  });

  it("follows a Similar link to the other card", async () => {
    await mount("/literature/#lcaPaper");
    act(() => {
      location.hash = "#symPaper";
      window.dispatchEvent(new HashChangeEvent("hashchange", LINKED));
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
