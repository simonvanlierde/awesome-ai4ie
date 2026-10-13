import { describe, expect, it } from "vitest";
import { rehypeTaskListLabels } from "./rehype-task-list-labels.mjs";

function el(tagName: string, properties = {}, children: object[] = []) {
  return { type: "element", tagName, properties, children };
}
function text(value: string) {
  return { type: "text", value };
}
function box() {
  return el("input", { type: "checkbox", disabled: true });
}

describe("rehypeTaskListLabels", () => {
  it("wraps the checkbox and its text in a label, leaving a nested list outside", () => {
    const nested = el("ul");
    const li = el("li", { className: ["task-list-item"] }, [box(), text(" Check units"), nested]);
    rehypeTaskListLabels()(el("ul", {}, [li]));
    expect(li.children).toEqual([el("label", {}, [box(), text(" Check units")]), nested]);
  });

  it("wraps inside the paragraph of a loose list item", () => {
    const p = el("p", {}, [box(), text(" Check units")]);
    const li = el("li", { className: ["task-list-item"] }, [p]);
    rehypeTaskListLabels()(li);
    expect(p.children).toEqual([el("label", {}, [box(), text(" Check units")])]);
  });

  it("leaves checkboxes outside task lists alone", () => {
    const form = el("form", {}, [box()]);
    rehypeTaskListLabels()(form);
    expect(form.children).toEqual([box()]);
  });
});
