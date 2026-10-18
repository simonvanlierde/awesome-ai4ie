# Maintaining

Notes for whoever looks after this repo. Contributors want [CONTRIBUTING.md](CONTRIBUTING.md).

Maintainer: Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)). A second
maintainer from the AI4IE working group is wanted. [`.github/CODEOWNERS`](.github/CODEOWNERS)
asks the maintainers to review every pull request.

## Turning a form into an entry

Issues from the forms arrive labelled `entry`, plus `paper`, `application` or `tool`.

1. Check that the source exists and says what the issue says. Read the paper, not only the
   abstract. The ground rules in CONTRIBUTING.md apply to maintainers too.
2. For a paper, look up the title, authors and year from the DOI or arXiv id, and use the
   citation key as `id`. Write the `blurb` from the "Why read it?" answer.
3. Map the dropdown labels back to tag keys in [`src/data/tags.ts`](src/data/tags.ts). An answer
   under "A field or technique that isn't listed" asks for a new tag. Add it with this first
   entry, as CONTRIBUTING.md describes.
4. Open a pull request with `Closes #<issue>` in its description, and thank the person who
   suggested it.

If a suggestion doesn't hold up, say why in the issue and close it.

## Routine

- **Dependencies.** Renovate opens one pull request a month for minor and patch updates and
  merges it once CI passes. Majors wait for a maintainer. Everything it plans is on the
  Dependency Dashboard issue.
- **Links.** The weekly link check ([`links.yml`](.github/workflows/links.yml)) opens one issue,
  or updates the open one, when an external link or DOI breaks.
- **Stale entries.** Tool entries carry the month they were checked. Recheck any older than a
  year.

## What's tied to the owner's account

GitHub moves the issues, pull requests, history and secrets with the repo, and redirects the
repo's old URLs. It does not redirect the GitHub Pages site. Check the rest after a move.

| What | Where | After a move |
| --- | --- | --- |
| GitHub Pages | Settings → Pages, source "GitHub Actions" | The old `simonvanlierde.github.io/awesome-ai4ie/` address stops working. See below. |
| Branch rules (`protect-main`) | Settings → Rules | Check they came across. They require the `check` and `build` jobs and block force pushes and deletion. Admins can bypass them. |
| Code scanning (CodeQL) | Settings → Code security | Check it's still on. |
| Renovate | The Renovate GitHub app, installed per account | Install the app on the new owner and give it this repo. Keep Dependabot alerts on: Renovate reads them. |
| Coverage (Codecov) | codecov.io, uploads without a token | Add the repo under the new owner, then fix the badge in README.md. |
| Discord invite | `discordUrl` in [`src/site.ts`](src/site.ts), README.md, the home page, [`config.yml`](.github/ISSUE_TEMPLATE/config.yml) | The invite can expire. A Discord admin can make a permanent one. |

## Moving the repo or adding a custom domain

[`src/site.ts`](src/site.ts) holds the owner, the repo name and the custom domain. The site
address, the base path, the social card, the edit links and the accessibility check all
follow it. Set the domain before a transfer: GitHub forwards the old github.io address to a
custom domain only while the repo is still under the old owner.

1. Point the domain's DNS at GitHub Pages, as
   [GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
   describes. Then enter it under Settings → Pages → Custom domain and turn on "Enforce HTTPS".
2. Set `domain` in `src/site.ts`. After a transfer, set `owner` too.
3. Update by hand what GitHub reads as plain text: the links and badges in README.md and the
   Discord link in `.github/ISSUE_TEMPLATE/config.yml`. Links inside this repo's Markdown files
   are relative and need no change.
4. Run `npm run build` and the accessibility check (CONTRIBUTING.md). After the deploy, open the
   live site and paste its address into a chat to check the link preview.
