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
    act(() => {
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

  it("puts search first and opens a facet's chips directly under the filter buttons", async () => {
    await mount("/literature/", many);
    const search = document.querySelector(".lit-search") as HTMLElement;
    const bar = document.querySelector(".lit-bar") as HTMLElement;
    await click(document.querySelector(".lit-facet-trigger"));
    const panel = document.querySelector(".lit-facet-panel") as HTMLElement;
    expect(search.nextElementSibling).toBe(bar);
    expect(bar.nextElementSibling).toBe(panel);
  });
});

describe("LiteratureBrowser with the map", () => {
  // lcaPaper top left, symPaper to its right, otherPaper below: a plate of 100 x 100.
  const MAP = {
    w: 100,
    h: 100,
    clusters: [{ name: "Water", n: 3, thin: true, d: "M0 0L10 0L10 10Z", lx: 50, ly: 5 }],
    points: "lcaPaper 10 10 0;symPaper 50 12 0;otherPaper 12 60 0",
  };
  const THREE = [...ENTRIES, entry("otherPaper", [])];
  async function mountMap(url: string) {
    history.replaceState(null, "", url);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<LiteratureBrowser entries={THREE} map={MAP} />));
  }
  const frame = () => document.querySelector<HTMLElement>(".lm-frame");
  const card = () => document.querySelector(".lm-card");
  const mark = (field: string) => document.querySelector(`.lm-plot .field-${field}`);
  const key = (k: string) =>
    act(async () => {
      frame()?.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
    });
  // The plate drawn at 200 x 200 px from the page's top left: plate units are half a pixel.
  function plateAt200() {
    const f = frame();
    if (f)
      f.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;
  }
  const pointer = (type: string, pointerType: string, x: number, y: number) =>
    act(async () => {
      const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperty(e, "pointerType", { value: pointerType });
      frame()?.dispatchEvent(e);
    });

  it("draws every placed paper and counts those the filters keep", async () => {
    await mountMap("/literature/?ie=lca");
    expect(document.querySelectorAll(".lm-plot .lm-dot")).toHaveLength(3);
    // Every paper the filters keep is on the map, so the count does not say it twice.
    expect(document.querySelector(".lit-count [role=status]")?.textContent).toBe("1 of 3 entries");
    expect(mark("lca")?.classList.contains("is-out")).toBe(false);
    expect(mark("symbiosis")?.classList.contains("is-out")).toBe(true);
    expect(document.querySelector(".lm-plot .lm-none")?.classList.contains("is-out")).toBe(true);
  });

  it("counts the papers on the map when some are not placed", async () => {
    history.replaceState(null, "", "/literature/");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const four = [...THREE, entry("newPaper", [])];
    await act(async () => root.render(<LiteratureBrowser entries={four} map={MAP} />));
    expect(document.querySelector(".lit-count [role=status]")?.textContent).toBe(
      "4 of 4 entries, 3 on the map",
    );
    expect(document.querySelector(".lm-figure figcaption")?.textContent).toContain(
      "1 paper is not placed yet and is not on the map.",
    );
  });

  it("is one tab stop with a name, behind a skip link to the list", async () => {
    await mountMap("/literature/");
    expect(document.querySelectorAll(".lm-figure [tabindex='0']")).toHaveLength(1);
    expect(frame()?.getAttribute("aria-label")).toMatch(/^Map of the literature, 3 papers/);
    expect(document.querySelector(".lm-plot")?.getAttribute("aria-hidden")).toBe("true");
    await click(document.querySelector(".lm-skip"));
    expect(document.activeElement?.id).toBe("lcaPaper");
  });

  it("moves with the arrow keys, opens with Enter and leaves with Escape", async () => {
    await mountMap("/literature/");
    await act(async () => frame()?.focus());
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper lcaPaper");
    await key("ArrowRight");
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper symPaper");
    await key("ArrowRight"); // nothing further right: stays
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper symPaper");
    await key("ArrowLeft");
    await key("ArrowDown");
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper otherPaper");
    expect(card()?.textContent).toContain("Water");
    await key("Escape");
    expect(card()).toBeNull();
    await key("Escape");
    expect(document.activeElement?.id).toBe("lcaPaper");
    await act(async () => frame()?.focus());
    await key("ArrowDown");
    await key("Enter");
    expect(window.location.hash).toBe("#otherPaper");
    expect(toggle("otherPaper")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.id).toBe("otherPaper");
  });

  it("tells a screen reader about key moves only, with the cluster and the map's edge", async () => {
    await mountMap("/literature/");
    const said = () => document.querySelector(".lm-view [aria-live]")?.textContent;
    plateAt200();
    await pointer("pointermove", "mouse", 20, 20);
    expect(card()).not.toBeNull();
    expect(said()).toBe("");
    await act(async () => frame()?.focus());
    await key("ArrowRight");
    expect(said()).toBe("Paper symPaper, 2024, Water");
    await key("ArrowRight");
    expect(said()).toBe("No paper further right.");
    await key("ArrowLeft");
    expect(said()).toBe("Paper lcaPaper, 2024, Water");
  });

  it("counts the papers a filter keeps in each cluster's name", async () => {
    await mountMap("/literature/");
    const names = () =>
      [...document.querySelectorAll(".lm-name, .lm-chip")].map((n) => n.textContent);
    expect(names()).toEqual(["Zoom to Water 3", "Zoom to Water 3"]);
    await pickField("lca");
    expect(names()).toEqual(["Zoom to Water 1", "Zoom to Water 1"]);
  });

  it("moves only between the papers the filters keep", async () => {
    await mountMap("/literature/?ie=lca,symbiosis");
    await act(async () => frame()?.focus());
    await key("ArrowDown"); // otherPaper is faded: nothing below
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper lcaPaper");
  });

  it("shows the card on the first tap and opens the paper on the second", async () => {
    await mountMap("/literature/");
    plateAt200();
    await pointer("pointerdown", "touch", 100, 24);
    await pointer("click", "touch", 100, 24);
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper symPaper");
    expect(card()?.textContent).toContain("Tap it again");
    expect(toggle("symPaper")?.getAttribute("aria-expanded")).toBe("false");
    await pointer("pointerdown", "touch", 101, 25);
    await pointer("click", "touch", 101, 25);
    expect(toggle("symPaper")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the card on hover and opens the paper on a click", async () => {
    await mountMap("/literature/");
    plateAt200();
    await pointer("pointermove", "mouse", 20, 20);
    expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper lcaPaper");
    await pointer("pointermove", "mouse", 190, 190); // far from every paper
    expect(card()).toBeNull();
    await pointer("pointerdown", "mouse", 20, 20);
    await pointer("click", "mouse", 20, 20);
    expect(toggle("lcaPaper")?.getAttribute("aria-expanded")).toBe("true");
  });

  describe("zoom", () => {
    // Reduced motion: every zoom lands at once, with no tween to wait for.
    const realMatchMedia = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") })) as typeof matchMedia;
    });
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });
    const viewBox = () => document.querySelector(".lm-plot")?.getAttribute("viewBox");
    // `n` presses of one key in a row.
    const keys = (k: string, n: number) =>
      act(() => {
        for (let i = 0; i < n; i++)
          frame()?.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      });
    const button = (name: string) =>
      [...document.querySelectorAll<HTMLButtonElement>(".lm-zoom button")].find(
        (b) => (b.getAttribute("aria-label") ?? b.textContent) === name,
      );

    it("zooms in and out about the middle with the buttons, and resets to the full map", async () => {
      await mountMap("/literature/");
      expect(viewBox()).toBe("0 0 100 100");
      expect(button("Zoom out")?.getAttribute("aria-disabled")).toBe("true");
      await click(button("Zoom in"));
      expect(viewBox()).toBe("18.75 18.75 62.5 62.5");
      expect(button("Zoom out")?.hasAttribute("aria-disabled")).toBe(false);
      await click(button("Zoom out"));
      expect(viewBox()).toBe("0 0 100 100");
      await click(button("Zoom in"));
      await click(button("Zoom in"));
      await click(button("Full map"));
      expect(viewBox()).toBe("0 0 100 100");
    });

    it("zooms with + and -, about the focused paper, up to 8x, and 0 resets", async () => {
      await mountMap("/literature/");
      await act(async () => frame()?.focus()); // lcaPaper at (10, 10)
      await key("+");
      expect(viewBox()).toBe("3.75 3.75 62.5 62.5");
      await key("-");
      expect(viewBox()).toBe("0 0 100 100");
      keys("+", 8);
      expect(viewBox()).toBe("8.75 8.75 12.5 12.5");
      expect(button("Zoom in")?.getAttribute("aria-disabled")).toBe("true");
      await key("0");
      expect(viewBox()).toBe("0 0 100 100");
    });

    it("pans to keep the paper the arrow keys move to in view", async () => {
      await mountMap("/literature/");
      await act(async () => frame()?.focus());
      keys("+", 4);
      const [, y0, , h0] = (viewBox() ?? "").split(" ").map(Number);
      expect(y0 + h0).toBeLessThan(60);
      await key("ArrowDown"); // otherPaper at (12, 60)
      expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper otherPaper");
      const [, y, , h] = (viewBox() ?? "").split(" ").map(Number);
      expect(y < 60 && y + h > 60).toBe(true);
    });

    it("zooms to a cluster from its name or its chip", async () => {
      const TWO = {
        ...MAP,
        w: 400,
        h: 400,
        clusters: [
          { ...MAP.clusters[0], name: "Pair", n: 2 },
          { ...MAP.clusters[0], name: "Lone", n: 1, lx: 12, ly: 40 },
        ],
        points: "lcaPaper 10 10 0;symPaper 50 12 0;otherPaper 12 60 1",
      };
      history.replaceState(null, "", "/literature/");
      host = document.createElement("div");
      document.body.append(host);
      root = createRoot(host);
      await act(async () => root.render(<LiteratureBrowser entries={THREE} map={TWO} />));
      const names = [...document.querySelectorAll(".lm-name")];
      expect(names.map((n) => n.textContent)).toEqual(["Zoom to Pair 2", "Zoom to Lone 1"]);
      await click(names[1]);
      // The lone paper with 32 units round it, kept on the plate.
      expect(viewBox()).toBe("0 28 64 64");
      await click(button("Full map"));
      expect(viewBox()).toBe("0 0 400 400");
      const chips = [...document.querySelectorAll(".lm-zoom .lm-chip")];
      expect(chips.map((n) => n.textContent)).toEqual(["Zoom to Pair 2", "Zoom to Lone 1"]);
      await click(chips[1]);
      expect(viewBox()).toBe("0 28 64 64");
    });

    it("zooms with the wheel only with Ctrl or once the map has focus", async () => {
      await mountMap("/literature/");
      plateAt200();
      // happy-dom's WheelEvent drops the mouse fields, so they are set on it here.
      const wheel = (mods: { ctrlKey?: boolean }) =>
        act(() => {
          const e = new WheelEvent("wheel", { deltaY: -200, cancelable: true });
          for (const [k, v] of Object.entries({
            clientX: 100,
            clientY: 100,
            ctrlKey: false,
            ...mods,
          }))
            Object.defineProperty(e, k, { value: v });
          frame()?.dispatchEvent(e);
        });
      wheel({});
      expect(viewBox()).toBe("0 0 100 100");
      wheel({ ctrlKey: true });
      expect(viewBox()).not.toBe("0 0 100 100");
      await key("0");
      await act(async () => frame()?.focus());
      await key("0");
      wheel({});
      expect(viewBox()).not.toBe("0 0 100 100");
    });
  });

  describe("card", () => {
    const pointerOut = (from: Element | null, to: Element | null) =>
      act(() => {
        const e = new MouseEvent("pointerout", { bubbles: true, relatedTarget: to });
        Object.defineProperty(e, "pointerType", { value: "mouse" });
        from?.dispatchEvent(e);
      });

    it("stays open while the pointer rests on it, and closes when it leaves", async () => {
      await mountMap("/literature/");
      plateAt200();
      await pointer("pointermove", "mouse", 20, 20);
      expect(card()).not.toBeNull();
      pointerOut(frame(), card());
      expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper lcaPaper");
      pointerOut(card(), document.body);
      expect(card()).toBeNull();
    });

    it("closes when the pointer leaves the map for the page", async () => {
      await mountMap("/literature/");
      plateAt200();
      await pointer("pointermove", "mouse", 20, 20);
      expect(card()).not.toBeNull();
      pointerOut(frame(), document.body);
      expect(card()).toBeNull();
    });

    it("closes when the map loses focus", async () => {
      await mountMap("/literature/");
      await act(async () => frame()?.focus());
      expect(card()).not.toBeNull();
      await act(async () => frame()?.blur());
      expect(card()).toBeNull();
    });

    it("closes when a filter leaves its paper out", async () => {
      await mountMap("/literature/");
      await act(async () => frame()?.focus());
      await key("ArrowRight");
      expect(card()?.querySelector(".lit-title")?.textContent).toBe("Paper symPaper");
      await pickField("lca");
      expect(card()).toBeNull();
    });

    it("closes on Escape anywhere in the page", async () => {
      await mountMap("/literature/");
      plateAt200();
      await pointer("pointermove", "mouse", 20, 20);
      expect(card()).not.toBeNull();
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      expect(card()).toBeNull();
    });
  });

  describe("colour modes", () => {
    const MODES_MAP = {
      ...MAP,
      modes: {
        ml: {
          legend: [{ cat: 0, label: "LLM", n: 3 }],
          cats: "000",
        },
        openalex: {
          legend: [
            { cat: 0, label: "Water", n: 1 },
            { cat: 6, label: "Other", n: 1 },
            { cat: 7, label: "No topic data", n: 1 },
          ],
          cats: "067",
        },
      },
    };
    async function mountModes(url: string) {
      history.replaceState(null, "", url);
      host = document.createElement("div");
      document.body.append(host);
      root = createRoot(host);
      await act(async () => root.render(<LiteratureBrowser entries={THREE} map={MODES_MAP} />));
    }
    const radios = () => [...document.querySelectorAll<HTMLInputElement>(".lm-modes input")];
    const classes = () =>
      [...document.querySelectorAll(".lm-plot .lm-dot")].map((p) => p.getAttribute("class"));

    it("colours by IE field until another mode is chosen, and says so in the URL", async () => {
      await mountModes("/literature/");
      expect(radios().map((r) => [r.checked, r.parentElement?.textContent])).toEqual([
        [true, "IE field"],
        [false, "AI technique"],
        [false, "OpenAlex topic"],
      ]);
      expect(document.querySelector(".lm-modes legend")?.textContent).toBe("Colour by");
      expect(classes()[0]).toContain("field-lca");
      await click(radios()[2]);
      expect(classes().map((c) => c?.replace("lm-dot ", ""))).toEqual([
        "lm-cat-0",
        "lm-cat-6",
        "lm-none",
      ]);
      expect([...document.querySelectorAll(".lm-key li")].map((li) => li.textContent)).toEqual([
        "Water (1)",
        "Other (1)",
        "No topic data (1)",
      ]);
      expect(location.search).toBe("?mode=openalex");
      await click(radios()[0]);
      expect(location.search).toBe("");
      expect(classes()[0]).toContain("field-lca");
    });

    it("opens in the mode the URL names and keeps the filters beside it", async () => {
      await mountModes("/literature/?ie=lca&mode=ml");
      expect(radios()[1].checked).toBe(true);
      expect(classes().every((c) => c?.includes("lm-cat-0") || c?.includes("is-out"))).toBe(true);
      await click(radios()[2]);
      expect(location.search).toBe("?ie=lca&mode=openalex");
    });

    it("offers no control when the page shipped no mode data", async () => {
      await mountMap("/literature/");
      expect(document.querySelector(".lm-modes")).toBeNull();
    });
  });
});
