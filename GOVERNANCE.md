# Governance

Awesome AI for Industrial Ecology has one maintainer, Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)). A second maintainer from the AI4IE working group is wanted (see [MAINTAINING.md](MAINTAINING.md)). This file says who decides and who has access.

## Who decides

I decide what goes into the site, the data files and the skills. Anyone can propose a change in an issue or a pull request. I weigh each proposal against [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) and the ground rules in [CONTRIBUTING.md](CONTRIBUTING.md#ground-rules). If I turn a proposal down, I say why in the issue or pull request.

Planned work is in [ROADMAP.md](ROADMAP.md).

## Who has access

- **Repository:** only the maintainer has write and admin access; the Renovate app also merges minor and patch dependency updates once CI passes. Other contributors send changes as pull requests.
- **Hosting and domain:** the site deploys from `main` to GitHub Pages once CI passes. Only the maintainer has access to the Cloudflare account that manages DNS for <https://ai4ie.org/>.
- **Bots:** Renovate opens monthly dependency updates and merges minor and patch updates after all checks pass. Major updates wait for a maintainer (`renovate.json5`).

## If the maintainer is unavailable

A named person can take over the GitHub repository, and the recovery details for Cloudflare are in an emergency-access vault.

The code is under the MIT licence ([LICENSE](LICENSE)) and the content is under CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)), so anyone can fork and keep publishing the guide. The site is a static build and keeps working without upkeep until a dependency or external link changes.

## Changes to this file

I change this file through a pull request, like any other change. If another maintainer joins or the repository moves to a working-group organisation, this file will name the new roles first.
