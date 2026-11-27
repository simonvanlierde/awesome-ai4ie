# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools", "brotli"]
#
# [tool.uv]
# exclude-newer = "1 week"
# ///
"""Rebuilds src/assets/fonts/*.woff2 from the @fontsource-variable packages.

    uv run scripts/subset-fonts.py

Each font is cut to the characters in UNICODES, and Archivo's width axis to the
72-100% the CSS uses (DESIGN.md sets titles at 72-90%, body at the default 100%).
A character outside UNICODES falls back to the next family, so src/assets/fonts.test.ts
(which reads charset.txt) fails when a page uses one that is neither covered nor on its known-fallback list.
Source Serif 4 declares the Reserved Font Name "Source" (OFL 1.1, clause 3), so the
modified subset is renamed inside the file; the CSS family name is set in
astro.config.mjs and is unaffected. Licences are copied beside the fonts.
"""

import shutil
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "node_modules/@fontsource-variable"
OUT = ROOT / "src/assets/fonts"

# Basic Latin, Latin-1, and the typographic punctuation the pages use.
UNICODES = [(0x20, 0x7E), (0xA0, 0xFF), 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2212]

# package, input file, output file, axis limits, rename family to
FONTS = [
    ("archivo", "archivo-latin-wdth-normal", "archivo.woff2", {"wdth": (72, 100)}, None),
    ("source-serif-4", "source-serif-4-latin-wght-normal", "source-serif-normal.woff2", {}, "Serif Subset"),
    ("source-serif-4", "source-serif-4-latin-wght-italic", "source-serif-italic.woff2", {}, "Serif Subset"),
    ("martian-mono", "martian-mono-latin-wght-normal", "martian-mono.woff2", {}, None),
]


def codepoints():
    for u in UNICODES:
        yield from range(u[0], u[1] + 1) if isinstance(u, tuple) else [u]


def build(pkg, src, dst, limits, rename):
    font = TTFont(PKG / pkg / "files" / f"{src}.woff2")
    if limits:
        font = instancer.instantiateVariableFont(font, limits)
    opts = subset.Options(flavor="woff2", hinting=True, notdef_outline=True)
    opts.layout_features = ["ccmp", "locl", "mark", "mkmk", "kern", "liga", "tnum"]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=list(codepoints()))
    sub.subset(font)
    if rename:
        style = "Italic" if "italic" in src else "Regular"
        for n in font["name"].names:
            text = {1: rename, 4: f"{rename} {style}", 6: f"{rename.replace(' ', '')}-{style}", 16: rename}.get(n.nameID)
            if text:
                n.string = text
    font.flavor = "woff2"
    font.save(OUT / dst)
    print(dst, (OUT / dst).stat().st_size)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in FONTS:
        build(*spec)
    (OUT / "charset.txt").write_text("".join(f"U+{c:04X}\n" for c in codepoints()), encoding="utf-8")
    for pkg in sorted({f[0] for f in FONTS}):
        shutil.copy(PKG / pkg / "LICENSE", OUT / f"LICENSE-{pkg}.txt")
