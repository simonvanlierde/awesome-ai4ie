import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { citedFigures, readNotes, unchecked } from "./cited-figures.mjs";

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

test("unchecked reads every block and undoes float error when rounding", () => {
  const two =
    "%% begin obsidian notes %% 7 %% end obsidian notes %%\n%% begin obsidian notes %% 9 %% end obsidian notes %%";
  expect(unchecked(["7", "9"], two)).toEqual([]);
  // 1.005 * 100 is 100.4999… in binary floating point
  expect(unchecked(["1.01"], "%% begin obsidian notes %% 1.005 %% end obsidian notes %%")).toEqual(
    [],
  );
});

test("readNotes finds notes by DOI, URL-form DOI and arXiv id, and keeps both of a duplicated item", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cited-figures-"));
  await writeFile(
    join(dir, "@a2021.md"),
    'DOI: "10.1000/ABC"\n%% begin obsidian notes %% 5 %% end obsidian notes %%',
  );
  await writeFile(
    join(dir, "@a2021a.md"),
    'DOI: "10.1000/ABC"\n%% begin obsidian notes %% 6 %% end obsidian notes %%',
  );
  await writeFile(join(dir, "@b2020.md"), 'DOI: "https://doi.org/10.1000/XYZ"');
  await writeFile(join(dir, "@c2025.md"), "url: http://arxiv.org/abs/2510.19886");
  await writeFile(join(dir, "notes.md"), 'DOI: "10.1000/skip"');
  const notes = await readNotes(dir);
  expect(unchecked(["5", "6"], notes.get("10.1000/abc"))).toEqual([]);
  expect(notes.has("10.1000/xyz")).toBe(true);
  expect(notes.has("10.48550/arxiv.2510.19886")).toBe(true);
  expect(notes.has("10.1000/skip")).toBe(false);
});
