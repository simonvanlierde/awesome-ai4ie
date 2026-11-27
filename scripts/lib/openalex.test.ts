import { afterEach, describe, expect, it, vi } from "vitest";
import { abstractHash, abstractText, entryDoi, metaRow, openalex } from "./openalex.mjs";

describe("openalex helpers", () => {
  it("rebuilds an abstract from its inverted index", () => {
    expect(abstractText({ world: [1], hello: [0] })).toBe("hello world");
    expect(abstractText({ a: [0, 2], b: [1] })).toBe("a b a");
    expect(abstractText(null)).toBe("");
  });

  it("hashes the abstract, and gives null for none", () => {
    expect(abstractHash({ hello: [0] })).toMatch(/^[0-9a-f]{64}$/);
    expect(abstractHash({ hello: [0] })).not.toBe(abstractHash({ world: [0] }));
    expect(abstractHash(undefined)).toBeNull();
  });

  it("names an arXiv-only entry by its DataCite DOI", () => {
    expect(entryDoi({ doi: "10.1111/JIEC.1" })).toBe("10.1111/jiec.1");
    expect(entryDoi({ arxiv: "2401.01234" })).toBe("10.48550/arxiv.2401.01234");
    expect(entryDoi({})).toBeUndefined();
  });

  it("keeps ids, the primary topic and a hash, never the abstract", () => {
    const row = metaRow({
      id: "https://openalex.org/W1",
      primary_topic: { id: "https://openalex.org/T2", display_name: "Life Cycle Assessment" },
      abstract_inverted_index: { hello: [0] },
    });
    expect(row).toEqual({
      openalex: "W1",
      topic: { id: "T2", name: "Life Cycle Assessment" },
      abstract: abstractHash({ hello: [0] }),
    });
    expect(JSON.stringify(row)).not.toContain("hello");
    expect(metaRow({ id: "https://openalex.org/W3" })).toEqual({
      openalex: "W3",
      topic: null,
      abstract: null,
    });
  });
});

describe("openalex request", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("drops the key when its account has no budget left", async () => {
    const auth: (string | undefined)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { headers: Record<string, string> }) => {
        auth.push(init.headers.Authorization);
        return auth.length === 1
          ? new Response('{"reason":"daily_budget"}', { status: 429 })
          : Response.json({ results: [] });
      }),
    );
    await expect(openalex({ filter: "doi:x" }, 3, "k")).resolves.toEqual({ results: [] });
    expect(auth).toEqual(["Bearer k", undefined]);
  });
});
