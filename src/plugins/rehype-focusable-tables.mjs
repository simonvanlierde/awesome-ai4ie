/**
 * Make each Markdown table keyboard-reachable.
 *
 * Starlight lets a wide table scroll sideways inside its own box. On a phone
 * that box must take keyboard focus, or keyboard users cannot scroll it
 * (WCAG 2.1.1; axe's scrollable-region-focusable rule).
 */
import { visit } from "./remark-base-links.mjs";

export function rehypeFocusableTables() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.tagName === "table") node.properties = { ...node.properties, tabIndex: 0 };
    });
  };
}
