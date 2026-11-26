import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AppEntry, LitEntry } from "../data/schemas";
import { FORMATS } from "../lib/citations";
import { StalledError } from "../lib/stall";
import AppList from "./AppList";
import ApplicationsExplorer from "./ApplicationsExplorer";
import LiteratureBrowser, { exportCitations, PaperDetails } from "./LiteratureBrowser";
import { EMPTY_FILTER, toggleTag } from "./litFilter";
import TagChips from "./TagChips";
import ZeroShotDemo, {
  classifyErrorMessage,
  classifySummary,
  createClassifierLoader,
  formatDownloadProgress,
  parseLabels,
} from "./ZeroShotDemo";

const SAMPLE_APPS: AppEntry[] = [
  {
    id: "lca-llm",
    name: "LCI extraction with LLMs",
    summary: "Extracts inventory flows from PDF reports.",
    ie: ["lca"],
    ml: ["llm"],
    stage: "tested",
    maturity: "promising",
    papers: ["preuss2024"],
    demo: "demos/clip-zero-shot/",
  },
  {
    id: "eol-cv",
    name: "Waste sorting with vision",
    summary: "Classifies material fractions on a belt.",
    ie: ["circular"],
    ml: ["cv"],
    stage: "applied",
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
    topic: [],
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
    ie: ["circular"],
    topic: [],
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
    expect(html).toContain("Life cycle assessment");
    expect(html).toContain("LLMs &amp; agents");
    expect(html).toContain("unknown-ml");
    expect(html).toContain("Review");
  });
});

describe("AppList", () => {
  it("renders paper count links, related reading fallback, and demo links", () => {
    const html = renderToStaticMarkup(<AppList apps={SAMPLE_APPS} />);
    expect(html).toContain("LCI extraction with LLMs");
    expect(html).toContain("Papers (1)");
    expect(html).toContain("Try the demo");
    expect(html).toContain("Related papers");
    expect(html).toContain("Tested in research studies");
    expect(html).toContain("Applied to real data");
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
    expect(html).toContain("Most mature stage: Applied to real data");
    expect(html).toContain("■■■");
    expect(html).toContain("Early studies");
    expect(html).toContain('data-n="0"');
  });
});

describe("LiteratureBrowser", () => {
  it("renders entries, formatted authors and export controls without a proposal badge", () => {
    const html = renderToStaticMarkup(<LiteratureBrowser entries={SAMPLE_LIT} />);
    expect(html).toContain("2 of 2 entries");
    expect(html).toContain("Preuss, N. &amp; You, F.");
    expect(html).toContain("Donati, F., et al.");
    expect(html).not.toContain("lit-proposal");
    expect(html).toContain("https://doi.org/10.1000/example");
    expect(html).toContain("https://arxiv.org/abs/2501.00001");
    expect(html).toContain("BibTeX");
    // Each card is a link target with a closed Details disclosure; the panel is not rendered.
    expect(html).toContain('id="preuss2024"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('lit-details"');
  });

  it("renders the empty state and disables bulk export when no entries exist", () => {
    const html = renderToStaticMarkup(<LiteratureBrowser entries={[]} />);
    expect(html).toContain("0 of 0 entries");
    expect(html).toContain("lit-empty");
    expect(html).toContain("disabled");
  });

  it("writes citation content to a downloaded Blob, revokes the URL, and reports failures", async () => {
    const clicked: { href: string; download: string }[] = [];
    const blobs: Blob[] = [];
    const anchor = {
      href: "",
      download: "",
      click() {
        clicked.push({ href: this.href, download: this.download });
      },
    };
    vi.useFakeTimers();
    vi.stubGlobal("document", { createElement: () => anchor });
    const createSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      blobs.push(obj as Blob);
      return "blob:test";
    });
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    try {
      const ok = await exportCitations([SAMPLE_LIT[0]], FORMATS[0], "preuss2024");
      expect(ok).toBe("Exported 1 entry as BibTeX");
      expect(clicked).toEqual([{ href: "blob:test", download: "preuss2024.bib" }]);
      expect(await blobs[0].text()).toContain("10.1000/example");
      expect(revokeSpy).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(revokeSpy).toHaveBeenCalledWith("blob:test");

      const fail = await exportCitations(SAMPLE_LIT, FORMATS[0], "all", () =>
        Promise.reject(new Error("boom")),
      );
      expect(fail).toBe("Export failed, try again");
    } finally {
      createSpy.mockRestore();
      revokeSpy.mockRestore();
      vi.unstubAllGlobals();
      vi.useRealTimers();
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
    expect(html).toContain("Your photo stays in this browser.");
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
    expect(classifyErrorMessage(new Error("offline"))).toContain("check your connection");
  });

  it("clears the cached promise on failure and reuses it after a successful load", async () => {
    let attempts = 0;
    const messages: string[] = [];
    const load = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("net");
      return async (
        _task: string,
        _model: string,
        opts: {
          progress_callback: (p: { status: string; file?: string; progress?: number }) => void;
        },
      ) => {
        opts.progress_callback({ status: "progress", file: "model.onnx", progress: 50 });
        return async () => [{ label: "metal", score: 0.9 }];
      };
    });
    const loadClassifier = createClassifierLoader(load);

    await expect(loadClassifier(() => undefined)).rejects.toThrow("net");
    const clf = await loadClassifier((m) => messages.push(m));
    expect(messages).toEqual(["Downloading the model… 50%"]);
    expect(await clf("blob:img", ["metal"])).toEqual([{ label: "metal", score: 0.9 }]);
    await loadClassifier(() => undefined);
    expect(load).toHaveBeenCalledTimes(2);
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

describe("PaperDetails", () => {
  const byId = new Map(SAMPLE_LIT.map((e) => [e.id, e]));
  const both: LitEntry = {
    ...SAMPLE_LIT[1],
    doi: "10.1000/both",
    ie: ["circular"],
    topic: ["buildings"],
  };

  it("lists both links, where the tags lead, citing applications and similar papers", () => {
    const html = renderToStaticMarkup(
      <PaperDetails
        entry={both}
        extras={{
          apps: [{ name: "Scrap sorting", href: "/applications-map/circular/#scrap" }],
          similar: ["preuss2024", "gone"],
        }}
        byId={byId}
        onExport={() => undefined}
        onCopy={() => undefined}
      />,
    );
    expect(html).toContain('id="draft2025-details"');
    expect(html).toContain("https://doi.org/10.1000/both");
    expect(html).toContain("https://arxiv.org/abs/2501.00001");
    expect(html).toContain("<dt>Cite</dt>");
    expect(html).toContain("BibTeX");
    expect(html).toContain("RIS");
    expect(html).toContain('href="/applications-map/circular/"');
    expect(html).toContain("field-circular");
    expect(html).toContain("topic=buildings");
    expect(html).toContain("ml=cv");
    expect(html).toContain('href="/applications-map/circular/#scrap"');
    // A similar id that is no longer listed is skipped.
    expect(html).toContain('href="#preuss2024"');
    expect(html).not.toContain("#gone");
    expect(html).toContain("Copy link");
    expect(html).toContain("/contribute/?type=other&amp;title=%5BEdit%5D");
  });

  it("leaves out rows with nothing to say", () => {
    const html = renderToStaticMarkup(
      <PaperDetails
        entry={{ ...SAMPLE_LIT[0], ml: [], ie: [] }}
        byId={byId}
        onExport={() => undefined}
        onCopy={() => undefined}
      />,
    );
    for (const row of ["More on", "Cited by", "Similar"]) expect(html).not.toContain(`<dt>${row}`);
    expect(html).toContain("<dt>Read</dt>");
    expect(html).not.toContain("arXiv");
  });
});

describe("SpaceEmbed", () => {
  it("frames each embed as a numbered figure with caption and lazy-load safeguards", () => {
    const astro = readFileSync("src/components/SpaceEmbed.astro", "utf8");
    const demos = readFileSync("src/content/docs/demos.mdx", "utf8");
    expect(astro).toContain('<figure class="space-embed-figure not-content">');
    expect(astro).toContain('<figcaption class="space-embed-caption">');
    expect(astro).toContain('role="status"');
    expect(astro).toContain('referrerPolicy = "no-referrer"');
    expect(astro).toContain("iframe.sandbox.add(");
    expect(demos).toContain('figure="Fig. 2"');
    expect(demos).toContain('figure="Fig. 3"');
  });
});
