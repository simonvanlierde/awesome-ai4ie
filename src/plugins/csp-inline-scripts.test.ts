import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { addInlineScriptHashes, cspInlineScripts } from "./csp-inline-scripts.mjs";

const hash = (body: string) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
const page = (policy: string, scripts: string) =>
  `<head><meta http-equiv="content-security-policy" content="${policy}">${scripts}</head>`;

describe("addInlineScriptHashes", () => {
  it("adds the hash of an inline script to script-src and leaves other directives alone", () => {
    const out = addInlineScriptHashes(
      page("img-src 'self'; script-src 'self'; style-src 'self'", "<script>a()</script>"),
    );
    expect(out).toContain(`script-src 'self' ${hash("a()")}; style-src 'self'`);
  });

  it("skips external scripts and hashes already listed", () => {
    const listed = page(
      `script-src 'self' ${hash("a()")}`,
      '<script src="/x.js"></script><script>a()</script>',
    );
    expect(addInlineScriptHashes(listed)).toBe(listed);
  });

  it("hashes an identical script once", () => {
    const out = addInlineScriptHashes(
      page("script-src 'self'", "<script>a()</script><script>a()</script>"),
    );
    expect(out.split(hash("a()")).length).toBe(2);
  });

  it("returns a page without a policy unchanged", () => {
    expect(addInlineScriptHashes("<script>a()</script>")).toBe("<script>a()</script>");
  });
});

describe("cspInlineScripts", () => {
  it("rewrites root and nested HTML files that need hashes and leaves other files untouched", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csp-inline-"));
    try {
      const subDir = join(dir, "sub");
      await mkdir(subDir);
      const htmlPath = join(dir, "index.html");
      const nestedPath = join(subDir, "nested.html");
      const cleanPath = join(dir, "clean.html");
      const txtPath = join(dir, "note.txt");
      const alreadyHashed = page(`script-src 'self' ${hash("c()")}`, "<script>c()</script>");
      await writeFile(htmlPath, page("script-src 'self'", "<script>b()</script>"));
      await writeFile(nestedPath, page("script-src 'self'", "<script>d()</script>"));
      await writeFile(cleanPath, alreadyHashed);
      await writeFile(txtPath, "<script>b()</script>");
      const hook = cspInlineScripts().hooks["astro:build:done"];
      await hook({ dir: pathToFileURL(dir) });
      expect(await readFile(htmlPath, "utf8")).toContain(hash("b()"));
      expect(await readFile(nestedPath, "utf8")).toContain(hash("d()"));
      expect(await readFile(cleanPath, "utf8")).toBe(alreadyHashed);
      expect(await readFile(txtPath, "utf8")).toBe("<script>b()</script>");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
