import { expect, test } from "vitest";
import { STARLIGHT_SEARCH, withoutSearchHint } from "./axe-filter.mjs";

const node = (target: string) => ({ target: [target] });
const rule = (id: string, ...targets: string[]) => ({ id, nodes: targets.map(node) });

test("the search button node alone drops the violation", () => {
  expect(withoutSearchHint([rule("label-content-name-mismatch", STARLIGHT_SEARCH)])).toEqual([]);
});

test("search node beside another node keeps only the other", () => {
  const out = withoutSearchHint([rule("label-content-name-mismatch", STARLIGHT_SEARCH, "a.x")]);
  expect(out[0].nodes).toEqual([node("a.x")]);
});

test("a different rule on the search selector is kept", () => {
  const out = withoutSearchHint([rule("color-contrast", STARLIGHT_SEARCH)]);
  expect(out).toHaveLength(1);
});
