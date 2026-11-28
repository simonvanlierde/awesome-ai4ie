import { expect, test } from "vitest";
import { numberProblems, prefixFor } from "./figure-numbers.mjs";

const fig = (label: string, rest = "") =>
  `<figure><figcaption><b>${label}</b> A plot.${rest}</figcaption></figure>`;
const title = (label: string) =>
  `<p class="table-title"><b data-astro-cid-x>${label}</b> Counts</p>`;

test("prefixFor gives home no prefix, chapters their position, footer pages a letter", () => {
  expect(prefixFor("")).toBe("");
  expect(prefixFor("literature")).toBe("2.");
  expect(prefixFor("best-practices/verify")).toBe("3.");
  expect(prefixFor("open-questions")).toBe("6.");
  expect(prefixFor("footprint")).toBe("A.");
  expect(prefixFor("privacy")).toBeUndefined();
});

test("numberProblems passes a site that follows the rule", () => {
  const pages = [
    { slug: "", html: fig("Fig. 1") },
    {
      slug: "literature",
      html: `${fig("Fig. 2.1")}${title("Table 2.1")}<p>Table 2.1 lists them.</p>`,
    },
    {
      slug: "best-practices",
      html: `${title("Table 3.1")}<p>See <a href="/">Fig.&nbsp;1</a>.</p>`,
    },
    { slug: "best-practices/verify", html: title("Table 3.2") },
    { slug: "footprint", html: `${fig("Fig. A.1")}<p>As Figure A.1 shows.</p>` },
    { slug: "tools", html: "<script>const s = 'Fig. 9';</script>" },
  ];
  expect(numberProblems(pages)).toEqual([]);
});

test("numberProblems flags a label two figures share", () => {
  const pages = [
    { slug: "demos", html: fig("Fig. 5.1") },
    { slug: "demos/cv-taxonomy", html: fig("Fig. 5.1") },
  ];
  expect(numberProblems(pages)).toContain("Fig. 5.1 is on /demos/ and /demos/cv-taxonomy/");
});

test("numberProblems flags a reference to a missing figure", () => {
  const pages = [{ slug: "literature", html: `${fig("Fig. 2.1")}<p>Compare Fig. 2.2.</p>` }];
  expect(numberProblems(pages)).toEqual(["/literature/ refers to Fig. 2.2, which no page has"]);
});

test("numberProblems flags the wrong chapter, a skipped number, a page outside the chapters", () => {
  const pages = [
    { slug: "", html: fig("Fig. 1") },
    { slug: "demos", html: `${fig("Fig. 2")}${fig("Fig. 5.2")}` },
    { slug: "privacy", html: title("Table 1") },
  ];
  expect(numberProblems(pages)).toEqual([
    "Fig. 2 on /demos/ should be Fig. 5.N",
    "/privacy/ has Table 1 but is outside the chapters: give it a letter",
    "Fig. 5.1 is missing: numbers skip",
  ]);
});

test("numberProblems flags numbers out of order on a page", () => {
  const pages = [{ slug: "tools", html: `${title("Table 4.2")}${title("Table 4.1")}` }];
  expect(numberProblems(pages)).toEqual(["Table 4.1 on /tools/ comes after Table 4.2"]);
});

test("numberProblems wants a link when the figure is on another page", () => {
  const pages = [
    { slug: "", html: fig("Fig. 1") },
    { slug: "literature", html: `${fig("Fig. 2.1")}<p>Like Fig. 1 on the home page.</p>` },
  ];
  expect(numberProblems(pages)).toEqual(["/literature/ names Fig. 1 on / without a link to it"]);
});
