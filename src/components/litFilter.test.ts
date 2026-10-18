import { describe, expect, it } from "vitest";
import { emptyMessage, matchesFilter, parseView, sortEntries, toQuery } from "./litFilter";

const entry = { ie: ["eol"], ml: ["cv", "segmentation"], type: ["method"] };

const none = { ie: [], ml: [], type: [], papers: [] };

describe("matchesFilter", () => {
  it("matches everything when no filters are active", () => {
    expect(matchesFilter(entry, none)).toBe(true);
  });
  it("requires a hit in every active dimension (AND across, OR within)", () => {
    expect(matchesFilter(entry, { ...none, ie: ["eol"], ml: ["cv"] })).toBe(true);
    expect(matchesFilter(entry, { ...none, ie: ["lca"], ml: ["cv"] })).toBe(false);
    expect(matchesFilter(entry, { ...none, ml: ["depth", "cv"] })).toBe(true);
  });
  it("treats missing tag arrays as empty", () => {
    expect(matchesFilter({ type: ["landmark-ml"] }, { ...none, ie: ["lca"] })).toBe(false);
    expect(matchesFilter({ type: ["landmark-ml"] }, { ...none, type: ["landmark-ml"] })).toBe(true);
  });
  it("narrows to specific entry ids via papers", () => {
    expect(matchesFilter({ id: "a" }, { ...none, papers: ["a", "b"] })).toBe(true);
    expect(matchesFilter({ id: "c" }, { ...none, papers: ["a", "b"] })).toBe(false);
    expect(matchesFilter({}, { ...none, papers: ["a"] })).toBe(false);
  });
});

describe("parseView", () => {
  it("parses comma-separated params and ignores unknown keys", () => {
    expect(parseView("?ie=eol,lca&ml=cv&foo=x")).toEqual({
      filter: { ...none, ie: ["eol", "lca"], ml: ["cv"] },
      sort: "year",
    });
  });
  it("handles empty search", () => {
    expect(parseView("")).toEqual({ filter: none, sort: "year" });
  });
  it("reads a known sort and falls back to year for an unknown one", () => {
    expect(parseView("?sort=title").sort).toBe("title");
    expect(parseView("?sort=bogus").sort).toBe("year");
  });
  it("round-trips through toQuery, sort included", () => {
    const filter = {
      ie: ["eol"],
      ml: ["cv", "depth"],
      type: [],
      papers: ["kirillovSegmentAnything2023"],
    };
    for (const sort of ["year", "authors", "title"] as const) {
      expect(parseView(toQuery({ filter, sort }))).toEqual({ filter, sort });
    }
    expect(parseView(toQuery({ filter: none, sort: "title" }))).toEqual({
      filter: none,
      sort: "title",
    });
  });
  it("escapes values, so a # or & in a hand-made URL stays a value", () => {
    const filter = { ...none, ie: ["a#b", "c&d"] };
    expect(parseView(toQuery({ filter, sort: "year" }))).toEqual({ filter, sort: "year" });
  });
  it("omits empty filters and the default sort", () => {
    expect(toQuery({ filter: none, sort: "year" })).toBe("");
    expect(toQuery({ filter: none, sort: "title" })).toBe("?sort=title");
    expect(toQuery({ filter: { ...none, ie: ["eol"] }, sort: "authors" })).toBe(
      "?ie=eol&sort=authors",
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
    expect(emptyMessage({ ...none, ie: ["lca", "mfa"], ml: ["cv"] }, label)).toBe(
      "No entry is tagged LCA or MFA and CV. Remove one of the filters above.",
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
