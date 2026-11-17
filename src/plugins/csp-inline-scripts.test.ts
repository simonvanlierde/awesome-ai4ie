import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addInlineScriptHashes } from "./csp-inline-scripts.mjs";

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
