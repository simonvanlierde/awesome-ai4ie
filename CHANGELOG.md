# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- An accessibility statement at `/accessibility/`, linked from the footer.
- A Content-Security-Policy `<meta>` tag on every page, and `/.well-known/security.txt`.
- Weekly OpenSSF Scorecard and advisory audits, a cold-install check of the README's
  development commands, and a dependency licence check (`pnpm run licenses`) in CI.
- A code of conduct, a security policy, and the test and coding-standard rules in
  CONTRIBUTING.md.
- An architecture description in the README.
- A page-weight budget (`pnpm run page-weight`): CI fails when a built page's first-visit
  transfer goes over its budget.

### Changed

- Git hooks run with prek in place of lefthook.
- Commit messages and pull request titles follow `type(scope): summary`, checked by a
  commit-msg hook and the pr-title workflow.

[Unreleased]: https://github.com/simonvanlierde/awesome-ai4ie/commits/HEAD
