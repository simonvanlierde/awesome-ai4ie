// biome-ignore lint/correctness/noNodejsModules: the vectors file is read with node:fs
import { mkdtempSync, writeFileSync } from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: a temp dir for the vectors file
import { tmpdir } from "node:os";
// biome-ignore lint/correctness/noNodejsModules: joins the temp path
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EMBED_MODEL } from "./semantic";
import { embedMissing, encodeVector, loadVectors, textKey, vectorRows } from "./vectors";

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
  it("reuses a file from the same model and embeds everything again after a model change", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "vectors-")), "v.json");
    const vectors = { [textKey("a")]: encodeVector([9, 9]) };
    writeFileSync(file, JSON.stringify({ model: EMBED_MODEL, vectors }));
    embed.mockClear();
    await embedMissing(["a"], embed, loadVectors(file));
    expect(embed).not.toHaveBeenCalled();
    writeFileSync(file, JSON.stringify({ model: "another-model", vectors }));
    await embedMissing(["a"], embed, loadVectors(file));
    expect(embed).toHaveBeenCalledWith(["a"]);
  });
});
