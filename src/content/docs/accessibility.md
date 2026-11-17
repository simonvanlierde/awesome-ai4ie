---
title: Accessibility statement
description: What the AI4IE site does for accessibility, what is checked and how to report a problem.
---

This page covers [ai4ie.org](https://ai4ie.org). Simon van Lierde builds the site and is
responsible for this page.

## How accessible the site is

The site aims to meet [WCAG 2.2](https://www.w3.org/TR/WCAG22/) at level AA. Its conformance
is **not assessed**: nobody has checked every WCAG 2.2 rule against it, and no outside expert
has tested it. This statement describes what is checked.

You can:

- read it in a light or a dark theme, which follows your device's setting;
- use the pages on a phone, and at 320 px wide with text at 200% without scrolling sideways;
- reach the literature filter with a keyboard.

## Known problems

Axe cannot decide some contrast checks, such as text over a figure. They are listed in CI
and have not been checked by hand.

The demos load code and models from other sites (jsDelivr and Hugging Face). The embedded
Hugging Face Spaces are third parties' apps, and this site does not test them.

## How it is checked

These checks run on every proposed change:

- [axe-core](https://github.com/dequelabs/axe-core) scans every page, in light and dark, at
  desktop and phone width, for WCAG 2.0, 2.1 and 2.2 level A and AA problems.
- Every page is loaded at phone width and at 320 px with text at 200%, and the check fails if
  it scrolls sideways.
- [Biome's accessibility rules](https://biomejs.dev/linter/rules/#a11y) check the code for
  problems such as missing alt text and invalid ARIA.

Automatic tools find only some problems, so passing them does not mean there are none. Nobody
has tested the site by hand with a screen reader. The site needs JavaScript for the filters,
the map explorer and the demos; the pages themselves read without it.

## Tell us about a problem

If part of the site is hard or impossible for you to use, email
[code@duinlab.nl](mailto:code@duinlab.nl). Say what you tried to do, what happened, and which
browser and assistive technology you use, if any. With a GitHub account you can also
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new). I reply within
10 working days.

## About this statement

Prepared and last reviewed: 17 November 2026. Next review: within 12 months. Method:
self-assessment, using the checks above.
