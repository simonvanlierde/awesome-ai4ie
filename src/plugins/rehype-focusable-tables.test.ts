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

describe("rehypeFocusableTables names", () => {
  const title = (label: string) =>
    el("p", { className: ["table-title"] }, [el("b", {}, [{ type: "text", value: label }])]);
  const gap = { type: "text", value: "\n" };

  it("ties a table to the title paragraph before it, ignoring whitespace", () => {
    const p = title("Table 3.1");
    const table = el("table");
    rehypeFocusableTables()(el("div", {}, [p, gap, table]));
    expect(p.properties).toMatchObject({ id: "table-3-1" });
    expect(table.properties).toMatchObject({ ariaLabelledBy: "table-3-1", tabIndex: 0 });
  });

  it("keeps ids unique and leaves untitled tables unnamed", () => {
    const [p1, p2] = [title("Table 3.1"), title("Table 3.1")];
    const [t1, t2, bare] = [el("table"), el("table"), el("table")];
    rehypeFocusableTables()(el("div", {}, [p1, t1, p2, t2, el("p"), bare]));
    expect(p2.properties).toMatchObject({ id: "table-3-1-2" });
    expect(t2.properties).toMatchObject({ ariaLabelledBy: "table-3-1-2" });
    expect(bare.properties).toEqual({ tabIndex: 0 });
  });

  it("handles the raw JSX paragraph MDX produces", () => {
    const p = {
      type: "mdxJsxFlowElement",
      name: "p",
      attributes: [{ type: "mdxJsxAttribute", name: "class", value: "table-title" }],
      children: [{ type: "text", value: "Table 4.1 Weight" }],
    };
    const table = el("table");
    rehypeFocusableTables()(el("root", {}, [p, table]));
    expect(p.attributes).toContainEqual({
      type: "mdxJsxAttribute",
      name: "id",
      value: "table-4-1",
    });
    expect(table.properties).toMatchObject({ ariaLabelledBy: "table-4-1" });
  });
});
