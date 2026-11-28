/**
 * Make each Markdown table keyboard-reachable and named.
 *
 * Starlight lets a wide table scroll sideways inside its own box. On a phone
 * that box must take keyboard focus, or keyboard users cannot scroll it
 * (WCAG 2.1.1; axe's scrollable-region-focusable rule). A focusable table also
 * needs a name (WCAG 1.3.1): when `<p class="table-title">` sits right before
 * it, the title gets an id slugged from its label and the table points at it.
 */
const text = (node) => (node.value ?? "") + (node.children ?? []).map(text).join("");

export function rehypeFocusableTables() {
  return (tree) => {
    const used = new Set();
    const walk = (node) => {
      const kids = node.children ?? [];
      kids.forEach((child, i) => {
        if (child.tagName === "table") {
          child.properties = { ...child.properties, tabIndex: 0 };
          const prev = kids.slice(0, i).findLast((k) => k.type !== "text" || k.value.trim());
          // Raw `<p class="...">` in MDX is a JSX node, not a hast element.
          const jsx = prev?.type === "mdxJsxFlowElement";
          const cls = jsx
            ? prev.attributes.find((a) => a.name === "class" || a.name === "className")?.value
            : prev?.properties?.className;
          if (
            (jsx ? prev.name : prev?.tagName) === "p" &&
            [cls].flat().join(" ").split(" ").includes("table-title")
          ) {
            const base = `${text(prev).match(/^\s*Table\s+[\d.]+/i)?.[0] ?? text(prev)}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            let id = base || "table-title";
            for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
            used.add(id);
            if (jsx) prev.attributes.push({ type: "mdxJsxAttribute", name: "id", value: id });
            else prev.properties = { ...prev.properties, id };
            child.properties.ariaLabelledBy = id;
          }
        }
        walk(child);
      });
    };
    walk(tree);
  };
}
