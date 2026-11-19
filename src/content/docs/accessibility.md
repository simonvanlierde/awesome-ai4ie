---
title: Accessibility statement
description: What the AI4IE site does for accessibility, what is checked and how to report a problem.
---

This page covers [ai4ie.org](https://ai4ie.org). Simon van Lierde builds the site and is
responsible for this page.

## How accessible the site is

The site aims to meet [WCAG 2.2](https://www.w3.org/TR/WCAG22/) at level AA.
Full conformance and screen reader use still need manual testing.

You can:

- read it in a light or dark theme that follows your device's setting
- use the pages at 320 px wide with text at 200% without scrolling sideways
- close literature filter menus with Escape and keep keyboard focus when you remove a filter

## Known problems

The automated checks flag some contrast cases, such as text over a figure, for
manual review. Those reviews are pending.

Other developers run the embedded Hugging Face demos. The site's accessibility
checks cover the surrounding page.

## How it is checked

These checks run on every proposed change:

- [axe-core](https://github.com/dequelabs/axe-core) scans every page, in light and dark, at
  desktop and phone width, for WCAG 2.0, 2.1 and 2.2 level A and AA problems.
- Every page is loaded at phone width and at 320 px with text at 200%, and the check fails if
  it scrolls sideways.
- [Biome's accessibility rules](https://biomejs.dev/linter/rules/#a11y) check the code for
  problems such as missing alt text and invalid ARIA.

You can read the pages with JavaScript off. Turn it on to use the filters, map
explorer and demos.

## Tell us about a problem

If part of the site is hard or impossible for you to use, email
[code@duinlab.nl](mailto:code@duinlab.nl). Say what you tried to do, what happened, and which
browser and assistive technology you use, if any. With a GitHub account you can also
[open an issue](https://github.com/simonvanlierde/awesome-ai4ie/issues/new). I reply within
10 working days.

## About this statement

Self-assessed on 17 November 2026 using the checks above. The next review is due
within 12 months.
