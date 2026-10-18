/**
 * Give each Markdown task-list checkbox (`- [ ] …`) an accessible name.
 *
 * GFM renders `<input type="checkbox" disabled> text` with nothing tying the
 * text to the box, so screen readers announce an unnamed checkbox. Wrapping the
 * box and its text in a `<label>` names it without repeating the text.
 */
import { visit } from "./remark-base-links.mjs";

export function rehypeTaskListLabels() {
  return (tree) => {
    visit(tree, (node) => {
      if (!node.properties?.className?.includes("task-list-item")) return;
      // A loose list puts the checkbox inside the item's first paragraph.
      const host = node.children.find((c) => c.tagName === "p") ?? node;
      const children = host.children;
      const i = children.findIndex(isTaskCheckbox);
      if (i === -1) return;
      // Stop before a nested list: a label holds phrasing content only.
      let end = children.findIndex((c, j) => j > i && isList(c));
      if (end === -1) end = children.length;
      // The box never changes (it is disabled), so screen readers get the text
      // as a list item rather than a dimmed checkbox nobody can tick.
      children[i].properties = { ...children[i].properties, ariaHidden: "true" };
      const label = { type: "element", tagName: "label", properties: {}, children: [] };
      label.children = children.splice(i, end - i, label);
    });
  };
}

const isTaskCheckbox = (n) => n.tagName === "input" && n.properties?.type === "checkbox";
const isList = (n) => n.tagName === "ul" || n.tagName === "ol";
