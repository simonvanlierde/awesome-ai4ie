import { describe, expect, it } from "vitest";
import { citeAuthors, formatAuthors, isNew, paperLink } from "./literature";

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
