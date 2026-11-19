import { describe, expect, it } from "vitest";
import { THIN_TOPIC, TOPIC_TAGS } from "../data/tags";
import { thinTopics } from "./topics";

describe("thinTopics", () => {
  it("lists every topic with fewer than THIN_TOPIC entries, with its count", () => {
    const water = Array.from({ length: THIN_TOPIC }, () => ({ topic: ["water"] }));
    const thin = thinTopics([...water, { topic: ["energy", "io"] }, { topic: ["io"] }, {}]);
    expect(thin.find((t) => t.topic === "water")).toBeUndefined();
    expect(thin.find((t) => t.topic === "energy")?.count).toBe(1);
    expect(thin.find((t) => t.topic === "io")?.count).toBe(2);
    expect(thin.find((t) => t.topic === "chemicals")?.count).toBe(0);
    expect(thin.length).toBe(Object.keys(TOPIC_TAGS).length - 1);
  });

  it("narrows to the thin topics that have an entry in one field, counted across all", () => {
    const thin = thinTopics(
      [{ topic: ["water"], ie: ["lca"] }, { topic: ["water"], ie: ["mfa"] }, { topic: ["io"] }],
      "lca",
    );
    expect(thin).toEqual([{ topic: "water", count: 2 }]);
  });
});
