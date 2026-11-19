import { describe, expect, it, vi } from "vitest";
import { embedMissing, encodeVector, textKey, vectorRows } from "./vectors";

describe("vectorRows", () => {
  it("numbers the embedded entries in id order, whatever order they come in", () => {
    const stored = {
      [textKey("b text")]: encodeVector([2, 2]),
      [textKey("a text")]: encodeVector([1, 1]),
    };
    const entries = [
      { id: "b", text: "b text" },
      { id: "unembedded", text: "no vector" },
      { id: "a", text: "a text" },
    ];
    const { rows, bytes } = vectorRows(entries, stored);
    expect([...rows]).toEqual([
      ["a", 0],
      ["b", 1],
    ]);
    expect([...new Float32Array(new Uint8Array(bytes).buffer)]).toEqual([1, 1, 2, 2]);
    expect(vectorRows([...entries].reverse(), stored).rows).toEqual(rows);
  });
});

describe("embedMissing", () => {
  const embed = vi.fn(async (texts: string[]) => texts.map((t) => [t.length, 0]));

  it("makes no embedding call when every text has a stored vector", async () => {
    const stored = {
      [textKey("a")]: encodeVector([9, 9]),
      [textKey("gone")]: encodeVector([1, 1]),
    };
    embed.mockClear();
    expect(await embedMissing(["a"], embed, stored)).toEqual({
      [textKey("a")]: stored[textKey("a")],
    });
    expect(embed).not.toHaveBeenCalled();
  });

  it("embeds only new or edited texts, once each, and keeps the stored rest", async () => {
    const stored = { [textKey("a")]: encodeVector([9, 9]) };
    embed.mockClear();
    const out = await embedMissing(["a", "bb", "bb", "ccc"], embed, stored);
    expect(embed).toHaveBeenCalledWith(["bb", "ccc"]);
    expect(out).toEqual({
      [textKey("a")]: stored[textKey("a")],
      [textKey("bb")]: encodeVector([2, 0]),
      [textKey("ccc")]: encodeVector([3, 0]),
    });
  });
});
