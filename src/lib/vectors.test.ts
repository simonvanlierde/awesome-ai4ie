import { describe, expect, it } from "vitest";
import { encodeVector, textKey, vectorRows } from "./vectors";

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
