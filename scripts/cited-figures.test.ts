import { expect, test } from "vitest";
import { citedFigures, unchecked } from "./cited-figures.mjs";

test("citedFigures splits a paragraph at each Cite and skips claims without numbers", () => {
  const page = `Researchers screen impacts with ML.
One model scored 0.82 on methanol <Cite id="a2025" />. Another study of
11 models found 1,000 or 37% wrong (see [B, 2015](https://doi.org/10.1016/x))
<Cite id="b2025">B</Cite>, <Cite id="c2024" />.

<FieldApplications ie="lca" />`;
  expect(citedFigures(page)).toEqual([
    {
      id: "a2025",
      claim: "Researchers screen impacts with ML. One model scored 0.82 on methanol",
      numbers: ["0.82"],
    },
    {
      id: "b2025",
      claim: "Another study of 11 models found 1,000 or 37% wrong (see [B, 2015])",
      numbers: ["11", "1000", "37", "2015"],
    },
  ]);
});

test("citedFigures leaves no angle bracket from nested tags", () => {
  expect(citedFigures(`<<b>i>3 sites <Cite id="a" />`)[0].claim).toBe("i3 sites");
});

test("unchecked reads only the reading-notes block", () => {
  const note = `abstract says 0.86
%% begin obsidian notes %%
- BERTScore F1 0.823 (p. 22539)
%% end obsidian notes %%`;
  expect(unchecked(["0.82", "0.86"], note)).toEqual(["0.86"]);
  expect(
    unchecked(
      ["0.86", "0.8", "0.85", "1456"],
      "%% begin obsidian notes %% 0.855 1,456 %% end obsidian notes %%",
    ),
  ).toEqual(["0.8", "0.85"]);
  expect(unchecked(["0.82"], "")).toEqual(["0.82"]);
});
