# Governance

Awesome AI for Industrial Ecology is a proposal for the AI4IE working group. I'm the maintainer,
Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)), and I'm looking for a
second maintainer from the group. [Maintainer duties](MAINTAINING.md).

## Who decides

Anyone can propose a change in an issue or pull request. I decide what goes in using
[PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) and the
[contribution rules](CONTRIBUTING.md#ground-rules). If I turn a proposal down, I say why in
the issue or pull request.

Planned work is in [ROADMAP.md](ROADMAP.md).

## Who has access

- **Repository:** only I have write and admin access, plus Renovate below. Other contributors send changes as pull requests.
- **Hosting and domain:** CI deploys `main` to GitHub Pages once every check passes. Only I have access to the Cloudflare account that manages DNS for <https://ai4ie.org/>.
- **Bots:** Renovate opens monthly dependency updates and merges minor and patch updates after all checks pass. Major updates wait for a maintainer (`renovate.json5`).

## If the maintainer is unavailable

A named person can take over the GitHub repository, and the recovery details for Cloudflare are in an emergency-access vault.

The code is MIT ([LICENSE](LICENSE)) and the content is CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). Anyone can fork and keep publishing the guide. The site is a static build, so its pages keep loading without a maintainer. Dependencies and external links still break over time, and the [routine in MAINTAINING.md](MAINTAINING.md#routine) is what catches them.

## Changes to this file

I change this file through a pull request, like any other change. If another maintainer joins or the repository moves to a working-group organisation, this file names the new roles first.
