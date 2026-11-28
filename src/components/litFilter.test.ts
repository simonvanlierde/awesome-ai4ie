import { describe, expect, it } from "vitest";
import {
  emptyMessage,
  hashTarget,
  matchesFilter,
  matchesText,
  parseView,
  sortEntries,
  toQuery,
  visibleCount,
} from "./litFilter";

const entry = { ie: ["circular"], ml: ["cv", "segmentation"], type: ["method"] };

const none = { ie: [], topic: [], ml: [], type: [], papers: [] };

describe("matchesFilter", () => {
  it("matches everything when no filters are active", () => {
    expect(matchesFilter(entry, none)).toBe(true);
  });
  it("requires a hit in every active dimension (AND across, OR within)", () => {
    expect(matchesFilter(entry, { ...none, ie: ["circular"], ml: ["cv"] })).toBe(true);
    expect(matchesFilter(entry, { ...none, ie: ["lca"], ml: ["cv"] })).toBe(false);
    expect(matchesFilter(entry, { ...none, ml: ["depth", "cv"] })).toBe(true);
  });
  it("treats missing tag arrays as empty", () => {
    expect(matchesFilter({ type: ["landmark-ml"] }, { ...none, ie: ["lca"] })).toBe(false);
    expect(matchesFilter({ topic: ["energy"] }, { ...none, topic: ["energy"] })).toBe(true);
    expect(matchesFilter({ type: ["landmark-ml"] }, { ...none, type: ["landmark-ml"] })).toBe(true);
  });
  it("narrows to specific entry ids via papers", () => {
    expect(matchesFilter({ id: "a" }, { ...none, papers: ["a", "b"] })).toBe(true);
    expect(matchesFilter({ id: "c" }, { ...none, papers: ["a", "b"] })).toBe(false);
    expect(matchesFilter({}, { ...none, papers: ["a"] })).toBe(false);
  });
});

describe("parseView", () => {
  it("drops a retired tag that has no replacement", () => {
    const { filter } = parseView("?ie=urban-mining&ml=cv");
    expect(filter.ie).toEqual([]);
    expect(filter.ml).toEqual(["cv"]);
  });
  it("parses comma-separated params and ignores unknown keys", () => {
    expect(parseView("?ie=circular,lca&ml=cv&foo=x")).toEqual({
      filter: { ...none, ie: ["circular", "lca"], ml: ["cv"] },
      sort: "year",
      q: "",
      mode: "ie",
    });
  });
  it("reads a retired tag as its replacement and moves a tag to its current dimension", () => {
    expect(parseView("?ie=mfa,sem,eol,urban-mining,uncertainty&topic=io").filter).toEqual({
      ...none,
      ie: ["sem", "circular", "eeio"],
      ml: ["uncertainty"],
    });
  });
  it("keeps a tag the vocabulary does not know", () => {
    expect(parseView("?ie=nope").filter.ie).toEqual(["nope"]);
  });
  it("handles empty search", () => {
    expect(parseView("")).toEqual({ filter: none, sort: "year", q: "", mode: "ie" });
  });
  it("reads a known sort and falls back to year for an unknown one", () => {
    expect(parseView("?sort=title").sort).toBe("title");
    expect(parseView("?sort=bogus").sort).toBe("year");
  });
  it("round-trips through toQuery, sort included", () => {
    const filter = {
      ie: ["circular"],
      topic: ["electronics"],
      ml: ["cv", "depth"],
      type: [],
      papers: ["kirillovSegmentAnything2023"],
    };
    for (const sort of ["year", "authors", "title"] as const) {
      expect(parseView(toQuery({ filter, sort, q: "" }))).toEqual({
        filter,
        sort,
        q: "",
        mode: "ie",
      });
    }
    expect(parseView(toQuery({ filter: none, sort: "title", q: "" }))).toEqual({
      filter: none,
      sort: "title",
      q: "",
      mode: "ie",
    });
  });
  it("escapes values, so a # or & in a hand-made URL stays a value", () => {
    const filter = { ...none, ie: ["a#b", "c&d"] };
    expect(parseView(toQuery({ filter, sort: "year", q: "" }))).toEqual({
      filter,
      sort: "year",
      q: "",
      mode: "ie",
    });
  });
  it("keeps the map's colour mode in the URL and ignores an unknown one", () => {
    expect(toQuery({ filter: none, sort: "year", q: "", mode: "openalex" })).toBe("?mode=openalex");
    expect(parseView("?mode=ml").mode).toBe("ml");
    expect(parseView("?mode=openalex").mode).toBe("openalex");
    // `topic=` is the site's own tag filter; the OpenAlex colouring is not called that.
    expect(parseView("?mode=topic").mode).toBe("ie");
    expect(parseView("?mode=bogus").mode).toBe("ie");
  });
  it("omits empty filters and the default sort", () => {
    expect(toQuery({ filter: none, sort: "year", q: "" })).toBe("");
    expect(toQuery({ filter: none, sort: "title", q: "" })).toBe("?sort=title");
    expect(toQuery({ filter: { ...none, ie: ["circular"] }, sort: "authors", q: "" })).toBe(
      "?ie=circular&sort=authors",
    );
  });
});

describe("sortEntries", () => {
  const es = [
    { year: 2020, authors: ["Zhao, F."], title: "Bravo" },
    { year: 2024, authors: ["Adams, B.", "Zhu, A."], title: "Alpha" },
    { year: 2020, authors: ["Adams, A."], title: "Charlie" },
  ];
  it("year sorts newest first, then by author", () => {
    expect(sortEntries(es, "year").map((e) => e.title)).toEqual(["Alpha", "Charlie", "Bravo"]);
  });
  it("authors sorts A–Z, newest first within an author", () => {
    expect(sortEntries(es, "authors").map((e) => e.title)).toEqual(["Alpha", "Charlie", "Bravo"]);
  });
  it("title sorts A–Z", () => {
    expect(sortEntries(es, "title").map((e) => e.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
  it("does not mutate the input", () => {
    const copy = [...es];
    sortEntries(es, "title");
    expect(es).toEqual(copy);
  });
});

describe("emptyMessage", () => {
  const label = (_dim: string, tag: string) => tag.toUpperCase();
  it("states the filter in the list's own logic", () => {
    expect(emptyMessage({ ...none, ie: ["lca", "sem"], ml: ["cv"] }, label)).toBe(
      "No entry is tagged LCA or SEM and CV. Remove one of the filters above.",
    );
  });
  it("puts a ?papers= selection first, so it does not blame a tag", () => {
    expect(emptyMessage({ ...none, ie: ["lca"], papers: ["a", "b"] }, label)).toBe(
      "None of the 2 linked papers is tagged LCA. Remove one of the filters above.",
    );
    expect(emptyMessage({ ...none, papers: ["gone"] }, label)).toBe(
      "The linked paper is not in this list.",
    );
  });
});

describe("hashTarget", () => {
  const ids = new Set(["zhaoDataScience2024", "a b"]);
  it("names a listed entry, decoded, and nothing else", () => {
    expect(hashTarget("#zhaoDataScience2024", ids)).toBe("zhaoDataScience2024");
    expect(hashTarget("#a%20b", ids)).toBe("a b");
    expect(hashTarget("#courses-videos-and-posts", ids)).toBeNull();
    expect(hashTarget("", ids)).toBeNull();
    expect(hashTarget("#%E0", ids)).toBeNull();
  });
});

describe("text filter", () => {
  const e = { title: "Segment Anything", authors: ["Kirillov, A."], blurb: "Promptable masks." };
  it("needs every word, in any case and order, across title, authors and blurb", () => {
    expect(matchesText(e, "")).toBe(true);
    expect(matchesText(e, "  ")).toBe(true);
    expect(matchesText(e, "anything SEGMENT")).toBe(true);
    expect(matchesText(e, "kirillov masks")).toBe(true);
    expect(matchesText(e, "segment depth")).toBe(false);
  });
  it("round-trips through the URL and leaves it out when empty", () => {
    const view = { filter: none, sort: "year" as const, q: "life cycle & more" };
    expect(toQuery(view)).toBe("?q=life%20cycle%20%26%20more");
    expect(parseView(toQuery(view)).q).toBe("life cycle & more");
    expect(toQuery({ ...view, q: "  " })).toBe("");
  });
});

describe("visibleCount", () => {
  it("caps at the limit, grows to reach a linked paper and never passes the total", () => {
    expect(visibleCount(20, 141, -1)).toBe(20);
    expect(visibleCount(20, 141, 50)).toBe(51);
    expect(visibleCount(20, 5, -1)).toBe(5);
  });
});
