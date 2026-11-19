import { expect, test } from "vitest";
import { isHeldOut, summarize } from "./lib/eval-metrics.mjs";

test("summarize scores hit@1 and MRR over in-list questions only", () => {
  const rows = [
    { expect: ["a"], shown: ["a", "x"] }, // rank 1
    { expect: ["a"], shown: ["x", "a"] }, // rank 2: a hit in the top 5, not at 1
    { expect: ["a"], shown: [] }, // miss
    { expect: [], shown: [] }, // off-list: not counted
  ];
  expect(summarize(rows)).toEqual({ n: 3, hit1: 1 / 3, mrr: (1 + 0.5 + 0) / 3 });
  expect(summarize([])).toEqual({ n: 0, hit1: 0, mrr: 0 });
});

test("odd-numbered questions are held out", () => {
  expect([0, 1, 2, 3].map(isHeldOut)).toEqual([false, true, false, true]);
});
