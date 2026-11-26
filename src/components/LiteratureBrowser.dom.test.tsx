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

async function mount(url: string, entries: LitEntry[] = ENTRIES) {
  history.replaceState(null, "", url);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<LiteratureBrowser entries={entries} extras={EXTRAS} />));
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

  it("renders linked evaluation evidence only when present, with links and source labels", async () => {
    const evidenced: LitEntry = {
      ...entry("evPaper", ["symbiosis"]),
      evidence: {
        dataset: {
          identifier: "Zenodo 10.5281/zenodo.0000000",
          url: "https://doi.org/10.5281/zenodo.0000000",
          provenance: "Test corpus.",
          modality: "Text.",
          access: "Open.",
          licence: "Not stated.",
        },
        task: {
          target: "Relation extraction.",
          scope: "Benchmark set.",
          split: "No fixed split reported.",
          metric: "Recall.",
          reference: "45 known exchanges.",
        },
        method: {
          repositories: [{ label: "Code repo", url: "https://example.org/repo" }],
          revision: "Not verified.",
          model: "Checkpoint not reported.",
        },
        results: [
          {
            source: "author-reported",
            metric: "Recall",
            value: "24 of 45 (53%)",
            uncertainty: "Not reported.",
            locator: "Results section.",
            setting: "Offline case study.",
            limits: "Unverified in practice.",
          },
          {
            source: "reproduced",
            metric: "Recall",
            value: "23 of 45 (51%)",
            uncertainty: "Not reported.",
            locator: "Repro log.",
            setting: "Clean environment.",
            limits: "Single run.",
          },
        ],
      },
    };
    history.replaceState(null, "", "/literature/#evPaper");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root.render(<LiteratureBrowser entries={[evidenced, ENTRIES[0]]} extras={{}} />),
    );
    const details = document.getElementById("evPaper-details");
    expect(details?.textContent).toContain("Dataset");
    expect(details?.textContent).toContain("Task and protocol");
    expect(details?.textContent).toContain("Method and implementation");
    expect(details?.textContent).toContain("Reported results");
    expect(details?.textContent).toContain("Author-reported");
    expect(details?.textContent).toContain("Reproduced");
    expect(details?.textContent).toContain("Not reported.");
    const hrefs = [...(details?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://doi.org/10.5281/zenodo.0000000");
    expect(hrefs).toContain("https://example.org/repo");
    expect(hrefs).toContain("https://doi.org/10.1000/evPaper");

    await click(toggle("lcaPaper"));
    expect(document.getElementById("lcaPaper-details")?.querySelector(".lit-evidence")).toBeNull();
  });
});

describe("LiteratureBrowser FLIP animation", () => {
  type AnimCall = {
    id: string;
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    cancel: ReturnType<typeof vi.fn>;
  };

  let origRect: typeof Element.prototype.getBoundingClientRect;
  let origAnimate: typeof Element.prototype.animate;
  let origMatchMedia: typeof window.matchMedia;

  function mockLayoutAndMotion(reducedMotion: boolean): AnimCall[] {
    const calls: AnimCall[] = [];
    origRect = Element.prototype.getBoundingClientRect;
    origAnimate = Element.prototype.animate;
    origMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    Element.prototype.getBoundingClientRect = function (this: Element) {
      const idx = this.parentElement ? [...this.parentElement.children].indexOf(this) : 0;
      const top = Math.max(idx, 0) * 100;
      return {
        top,
        left: 0,
        right: 400,
        bottom: top + 80,
        width: 400,
        height: 80,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    };

    Element.prototype.animate = function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const cancel = vi.fn();
      calls.push({
        id: this.id,
        keyframes: (keyframes as Keyframe[]) ?? [],
        options: (options as KeyframeAnimationOptions) ?? {},
        cancel,
      });
      return { cancel } as unknown as Animation;
    };

    return calls;
  }

  afterEach(() => {
    Element.prototype.getBoundingClientRect = origRect;
    Element.prototype.animate = origAnimate;
    window.matchMedia = origMatchMedia;
  });

  function pickSort(value: string) {
    const select = document.querySelector<HTMLSelectElement>(".lit-sort select");
    act(() => {
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("animates remaining rows that move on filter and sort, under 300 ms, and not on hydration or details toggle", async () => {
    const calls = mockLayoutAndMotion(false);
    const entries = [
      { ...entry("lcaPaper", ["lca"]), year: 2023 },
      { ...entry("symPaper", ["symbiosis"]), year: 2025 },
    ];
    // Initial hydration (with URL query) must not animate.
    await mount("/literature/?sort=year", entries);
    expect(calls).toHaveLength(0);

    // Expanding/collapsing Details must not animate.
    await click(toggle("symPaper"));
    await click(toggle("symPaper"));
    expect(calls).toHaveLength(0);

    // Filtering to "lca" removes symPaper (index 0); lcaPaper moves from index 1 (100) to 0 (0).
    await pickField("lca");
    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe("lcaPaper");
    expect(calls[0].keyframes).toEqual([
      { transform: "translate(0px, 100px)" },
      { transform: "none" },
    ]);
    expect(Number(calls[0].options.duration)).toBeGreaterThan(0);
    expect(Number(calls[0].options.duration)).toBeLessThan(300);

    // Clear all brings symPaper back at index 0; lcaPaper moves from 0 to 1 (dy = -100),
    // cancelling its previous in-flight animation first.
    await click(document.querySelector(".lit-clear"));
    expect(calls[0].cancel).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(calls[1].id).toBe("lcaPaper");
    expect(calls[1].keyframes).toEqual([
      { transform: "translate(0px, -100px)" },
      { transform: "none" },
    ]);

    // Switching sort from year (symPaper, lcaPaper) to title (lcaPaper, symPaper) moves both rows.
    pickSort("title");
    expect(calls).toHaveLength(4);
    expect(calls.slice(2).map((c) => [c.id, c.keyframes[0]])).toEqual([
      ["lcaPaper", { transform: "translate(0px, 100px)" }],
      ["symPaper", { transform: "translate(0px, -100px)" }],
    ]);
  });

  it("skips FLIP completely when prefers-reduced-motion: reduce is set", async () => {
    const calls = mockLayoutAndMotion(true);
    const entries = [
      { ...entry("lcaPaper", ["lca"]), year: 2023 },
      { ...entry("symPaper", ["symbiosis"]), year: 2025 },
    ];
    await mount("/literature/", entries);
    await pickField("lca");
    await click(document.querySelector(".lit-clear"));
    pickSort("title");
    expect(calls).toHaveLength(0);
  });

  it("does not animate rows whose position did not change", async () => {
    const calls = mockLayoutAndMotion(false);
    // Default order: lcaPaper at index 0, symPaper at index 1.
    await mount("/literature/");
    // Filtering to "lca" removes symPaper; lcaPaper stays at index 0 (delta 0).
    await pickField("lca");
    expect(calls).toHaveLength(0);
  });
});

describe("LiteratureBrowser pagination and text filter", () => {
  const many = Array.from({ length: 45 }, (_, i) => ({
    ...entry(`p${String(i).padStart(2, "0")}`, ["lca"]),
    year: 2000 + i,
    title: i === 7 ? "Needle in a haystack" : `Paper ${i}`,
  }));
  const listed = () => document.querySelectorAll(".lit-entry").length;
  const more = () => document.querySelector<HTMLButtonElement>(".lit-more");
  const type = (value: string) =>
    act(async () => {
      const input = document.querySelector<HTMLInputElement>(".lit-search input");
      if (!input) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("lists 20, then 20 more with focus on the first new card, and announces the count", async () => {
    await mount("/literature/", many);
    expect(listed()).toBe(20);
    expect(document.querySelector("[role=status]")?.textContent).toBe(
      "45 of 45 entries, showing the first 20",
    );
    await click(more());
    expect(listed()).toBe(40);
    expect(document.activeElement?.id).toBe(document.querySelectorAll(".lit-entry")[20]?.id);
    await click(more());
    expect(listed()).toBe(45);
    expect(more()).toBeNull();
  });

  it("filters by text, keeps it in the URL and combines with tags", async () => {
    await mount("/literature/", many);
    await type("needle");
    expect(listed()).toBe(1);
    expect(location.search).toBe("?q=needle");
    await pickField("symbiosis");
    expect(listed()).toBe(0);
    expect(location.search).toBe("?ie=symbiosis&q=needle");
  });

  it("reads q from the URL, and shows a linked paper past the first page", async () => {
    await mount("/literature/?q=paper", many);
    expect((document.querySelector(".lit-search input") as HTMLInputElement).value).toBe("paper");
    await act(async () => root.unmount());
    host.remove();
    await mount("/literature/#p00", many); // the oldest paper sorts last
    expect(document.getElementById("p00")).not.toBeNull();
    expect(document.activeElement?.id).toBe("p00");
  });

  it("says a text search matched nothing, and Clear all keeps focus on the count", async () => {
    await mount("/literature/", many);
    await type("zzzz");
    expect(document.querySelector(".lit-empty")?.textContent).toBe("No entry matches that search.");
    await click(document.querySelector(".lit-clear"));
    expect(document.querySelector(".lit-search input")).not.toBeNull();
    expect(listed()).toBe(20);
    expect(document.activeElement?.getAttribute("role")).toBe("status");
  });
});
