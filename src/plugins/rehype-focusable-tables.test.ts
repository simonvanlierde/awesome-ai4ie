import { describe, expect, it } from "vitest";
import { rehypeFocusableTables } from "./rehype-focusable-tables.mjs";

function el(tagName: string, properties = {}, children: object[] = []) {
  return { type: "element", tagName, properties, children };
}

describe("rehypeFocusableTables", () => {
  it("puts every table in the tab order and leaves other elements alone", () => {
    const table = el("table", { className: ["wide"] });
    const p = el("p");
    rehypeFocusableTables()(el("div", {}, [table, p]));
    expect(table.properties).toEqual({ className: ["wide"], tabIndex: 0 });
    expect(p.properties).toEqual({});
  });
});
