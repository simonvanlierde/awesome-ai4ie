import { describe, expect, it } from "vitest";
import { IE_TAGS, ML_TAGS, SHORT_LABELS } from "./tags";

describe("SHORT_LABELS", () => {
  it("starts each tag's full label, so Fig. 1 reads like the filter chips", () => {
    const full: Record<string, string> = { ...IE_TAGS, ...ML_TAGS };
    for (const [tag, short] of Object.entries(SHORT_LABELS))
      expect(full[tag].startsWith(short), `${tag}: "${short}" vs "${full[tag]}"`).toBe(true);
  });
});
