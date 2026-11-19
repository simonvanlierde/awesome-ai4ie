import { describe, expect, it } from "vitest";
import { citeAuthors, formatAuthors, isNew, paperExtras, paperLink } from "./literature";
import { siteUrl } from "./urls";

const one = { authors: ["van Lierde, S."] };
const two = { authors: ["Peled, Y.", "Fishman, T."] };
const three = { authors: ["Preuss, N.", "Alshehri, A. S.", "You, F."] };
const cut = { authors: ["Donati, F."], etAl: true };

describe("formatAuthors", () => {
  it("joins with commas and an ampersand, and marks a cut list", () => {
    expect(formatAuthors(one)).toBe("van Lierde, S.");
    expect(formatAuthors(two)).toBe("Peled, Y. & Fishman, T.");
    expect(formatAuthors(three)).toBe("Preuss, N., Alshehri, A. S. & You, F.");
    expect(formatAuthors(cut)).toBe("Donati, F., et al.");
  });
});

describe("citeAuthors", () => {
  it("names one or two authors and shortens three or more", () => {
    expect(citeAuthors(one)).toBe("van Lierde");
    expect(citeAuthors(two)).toBe("Peled & Fishman");
    expect(citeAuthors(three)).toBe("Preuss et al.");
    expect(citeAuthors(cut)).toBe("Donati et al.");
  });
});

describe("paperLink", () => {
  it("links a DOI or an arXiv id, preferring the DOI", () => {
    expect(paperLink({ doi: "10.1111/jiec.13313" })).toEqual({
      href: "https://doi.org/10.1111/jiec.13313",
      label: "DOI 10.1111/jiec.13313",
    });
    expect(paperLink({ arxiv: "2307.10320" })).toEqual({
      href: "https://arxiv.org/abs/2307.10320",
      label: "arXiv 2307.10320",
    });
    expect(paperLink({ doi: "10.1/x", arxiv: "2307.10320" }).label).toBe("DOI 10.1/x");
  });
});

describe("isNew", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  it("is true within 60 days of the first of the added month", () => {
    expect(isNew("2026-10", now)).toBe(true);
    expect(isNew("2026-09", now)).toBe(true);
    expect(isNew("2026-08", now)).toBe(false);
    expect(isNew("2026-11", now)).toBe(false);
  });
});

describe("paperExtras", () => {
  const entries = [{ id: "lcaPaper" }, { id: "lciPaper" }, { id: "noVector" }, { id: "farPaper" }];
  const apps = [
    { id: "llmLci", name: "LLM-filled inventories", ie: ["lca", "sem"], papers: ["lciPaper"] },
    { id: "unused", name: "Cites nothing here", ie: ["eeio"], papers: ["elsewhere"] },
  ];
  // lca and lci point almost the same way; far is at right angles to both.
  const vectors = [[1, 0], [0.9, 0.44], undefined, [0, 1]];
  const x = paperExtras(entries, apps, vectors);

  it("links each citing application on its first field's page", () => {
    expect(x.lciPaper.apps).toEqual([
      { name: "LLM-filled inventories", href: siteUrl("applications-map/lca/#llmLci") },
    ]);
    expect(x.lcaPaper.apps).toEqual([]);
  });

  it("names similar papers by id, and none for an entry without a vector", () => {
    expect(x.lcaPaper.similar).toEqual(["lciPaper"]);
    expect(x.lciPaper.similar).toEqual(["lcaPaper"]);
    expect(x.noVector.similar).toEqual([]);
    expect(x.farPaper.similar).toEqual([]);
  });
});
