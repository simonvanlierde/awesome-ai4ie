import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AppEntry, LitEntry } from "../data/schemas";
import { FORMATS } from "../lib/citations";
import { StalledError } from "../lib/stall";
import AppList from "./AppList";
import ApplicationsExplorer, { GroupedApps } from "./ApplicationsExplorer";
import LiteratureBrowser, { ActivePills, exportCitations, FacetPanel } from "./LiteratureBrowser";
import { EMPTY_FILTER, toggleTag } from "./litFilter";
import TagChips from "./TagChips";
import ZeroShotDemo, {
  classifyErrorMessage,
  classifySummary,
  formatDownloadProgress,
  getClassifier,
  parseLabels,
  ResultsList,
} from "./ZeroShotDemo";

const SAMPLE_APPS: AppEntry[] = [
  {
    id: "lca-llm",
    name: "LCI extraction with LLMs",
    summary: "Extracts inventory flows from PDF reports.",
    ie: ["lca"],
    ml: ["llm"],
    maturity: "promising",
    papers: ["preuss2024"],
    demo: "demos/clip-zero-shot/",
  },
  {
    id: "eol-cv",
    name: "Waste sorting with vision",
    summary: "Classifies material fractions on a belt.",
    ie: ["eol"],
    ml: ["cv"],
    maturity: "established",
    papers: [],
  },
];

const SAMPLE_LIT: LitEntry[] = [
  {
    id: "preuss2024",
    title: "Large language models for life cycle inventory",
    authors: ["Preuss, N.", "You, F."],
    etAl: false,
    year: 2024,
    doi: "10.1000/example",
    ie: ["lca"],
    ml: ["llm"],
    type: ["method"],
    blurb: "Tests extraction accuracy on industrial reports.",
    added: "2026-04",
  },
  {
    id: "draft2025",
    title: "Vision models for scrap sorting",
    authors: ["Donati, F."],
    etAl: true,
    year: 2025,
    arxiv: "2501.00001",
    ie: ["eol"],
    ml: ["cv"],
    type: ["review"],
    blurb: "Surveys benchmark datasets for scrap sorting.",
    added: "2026-04",
    status: "proposal",
  },
];

describe("TagChips", () => {
  it("renders IE, ML and type chips in dimension order with field ink classes", () => {
    const html = renderToStaticMarkup(
      <TagChips ie={["lca"]} ml={["llm", "unknown-ml"]} type={["review"]} />,
    );
    expect(html).toContain('class="lit-tag lit-tag-ie field-lca"');
    expect(html).toContain("LCA &amp; footprinting");
    expect(html).toContain("LLMs &amp; agents");
    expect(html).toContain("unknown-ml");
    expect(html).toContain("Review");
  });
});

describe("AppList", () => {
  it("renders paper count links, related reading fallback, and demo links", () => {
    const html = renderToStaticMarkup(<AppList apps={SAMPLE_APPS} />);
    expect(html).toContain("LCI extraction with LLMs");
    expect(html).toContain("papers (1) →");
    expect(html).toContain("demo →");
    expect(html).toContain("related reading →");
  });
});

describe("ApplicationsExplorer", () => {
  it("renders the mode toggle and grid with linked, unlinked and empty cells", () => {
    const html = renderToStaticMarkup(<ApplicationsExplorer entries={SAMPLE_APPS} />);
    expect(html).toContain("Grid");
    expect(html).toContain("By AI technique");
    expect(html).toContain("Table 1.1");
    expect(html).toContain("Papers for 1 application: LCI extraction with LLMs");
    expect(html).toContain("1 application: Waste sorting with vision");
    expect(html).toContain('data-n="0"');

    const grouped = renderToStaticMarkup(<GroupedApps entries={SAMPLE_APPS} mode="ml" />);
    expect(grouped).toContain("LLMs &amp; agents");
    expect(grouped).toContain("Computer vision");
  });
});

describe("LiteratureBrowser", () => {
  it("renders entries, author formatting, proposal badge and export controls", () => {
    const html = renderToStaticMarkup(<LiteratureBrowser entries={SAMPLE_LIT} />);
    expect(html).toContain("2 of 2 entries");
    expect(html).toContain("Preuss, N. &amp; You, F.");
    expect(html).toContain("Donati, F., et al.");
    expect(html).toContain("proposal");
    expect(html).toContain("https://doi.org/10.1000/example");
    expect(html).toContain("https://arxiv.org/abs/2501.00001");
    expect(html).toContain("BibTeX");
  });

  it("renders the empty state and disables bulk export when no entries exist", () => {
    const html = renderToStaticMarkup(<LiteratureBrowser entries={[]} />);
    expect(html).toContain("0 of 0 entries");
    expect(html).toContain("lit-empty");
    expect(html).toContain("disabled");
  });

  it("renders open facet panels and active filter pills", () => {
    const panel = renderToStaticMarkup(
      <FacetPanel dim="ie" selected={["lca"]} onToggle={() => {}} onClose={() => {}} />,
    );
    expect(panel).toContain('aria-label="IE field"');
    expect(panel).toContain('aria-pressed="true"');

    const pills = renderToStaticMarkup(
      <ActivePills
        pills={[{ id: "ie:lca", dim: "ie", tag: "lca", label: "LCA & footprinting" }]}
        paperCount={2}
        onRemoveTag={() => {}}
        onRemovePapers={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(pills).toContain('aria-label="Remove filter: LCA &amp; footprinting"');
    expect(pills).toContain("2 linked papers");
    expect(pills).toContain("Clear all");
  });

  it("downloads citations and reports failures cleanly", async () => {
    const clicked: { href: string; download: string }[] = [];
    const anchor = {
      href: "",
      download: "",
      click() {
        clicked.push({ href: this.href, download: this.download });
      },
    };
    vi.stubGlobal("document", { createElement: () => anchor });
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const ok = await exportCitations([SAMPLE_LIT[0]], FORMATS[0], "preuss2024");
      expect(ok).toBe("Exported 1 entry as BibTeX");
      expect(clicked).toEqual([{ href: "blob:test", download: "preuss2024.bib" }]);
      await new Promise((r) => setTimeout(r, 0));
      expect(revokeSpy).toHaveBeenCalledWith("blob:test");

      const fail = await exportCitations(SAMPLE_LIT, FORMATS[0], "all", () =>
        Promise.reject(new Error("boom")),
      );
      expect(fail).toBe("Export failed, try again");
    } finally {
      createSpy.mockRestore();
      revokeSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

describe("ZeroShotDemo", () => {
  it("renders file input, default labels, disabled classify button and live status region", () => {
    const html = renderToStaticMarkup(<ZeroShotDemo />);
    expect(html).toContain('type="file"');
    expect(html).toContain("intact appliance, corroded metal part");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Pick a photo to enable Classify");
  });

  it("parses labels, formats progress and summary, and distinguishes stalled errors", () => {
    expect(parseLabels(" metal, plastic, metal,  , ")).toEqual(["metal", "plastic"]);
    expect(formatDownloadProgress({ status: "progress", file: "model.onnx", progress: 42.6 })).toBe(
      "Downloading the model… 43%",
    );
    expect(formatDownloadProgress({ status: "progress", file: "model.onnx" })).toBe(
      "Downloading the model… 0%",
    );
    expect(formatDownloadProgress({ status: "done", file: "model.onnx" })).toBeNull();
    expect(classifySummary([{ label: "circuit board", score: 0.876 }])).toBe(
      "Done: circuit board scores highest, 87.6%.",
    );
    expect(classifyErrorMessage(new StalledError("stalled"))).toContain("stopped making progress");
    expect(classifyErrorMessage(new Error("offline"))).toContain("Could not load or run");

    const bars = renderToStaticMarkup(
      <ResultsList results={[{ label: "circuit board", score: 0.876 }]} />,
    );
    expect(bars).toContain("width:88%");
    expect(bars).toContain("87.6%");
  });

  it("resets classifier cache on failure and caches a successful load", async () => {
    await expect(
      getClassifier(
        () => {},
        () => Promise.reject(new Error("net")),
      ),
    ).rejects.toThrow("net");
    const messages: string[] = [];
    const load = vi.fn(
      async () =>
        async (
          _task: string,
          _model: string,
          opts: {
            progress_callback: (p: { status: string; file?: string; progress?: number }) => void;
          },
        ) => {
          opts.progress_callback({ status: "progress", file: "model.onnx", progress: 50 });
          return async () => [{ label: "metal", score: 0.9 }];
        },
    );
    const clf = await getClassifier((m) => messages.push(m), load);
    expect(messages).toEqual(["Downloading the model… 50%"]);
    expect(await clf("blob:img", ["metal"])).toEqual([{ label: "metal", score: 0.9 }]);
    await getClassifier(() => {}, load);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("toggleTag", () => {
  it("adds an inactive tag and removes an active one", () => {
    const added = toggleTag(EMPTY_FILTER, "ie", "lca");
    expect(added.ie).toEqual(["lca"]);
    const removed = toggleTag(added, "ie", "lca");
    expect(removed.ie).toEqual([]);
  });
});
