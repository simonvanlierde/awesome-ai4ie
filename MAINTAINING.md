# Maintaining

Notes for whoever looks after this repo. Contributors want [CONTRIBUTING.md](CONTRIBUTING.md).

Maintainer: Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)). A second
maintainer from the AI4IE working group is wanted. [`.github/CODEOWNERS`](.github/CODEOWNERS)
asks the maintainers to review every pull request. Until there are two of us, that request is
advisory.

## Turning a form into an entry

Issues from the forms arrive labelled `entry`, plus `paper`, `application` or `tool`. Treat what
the form says as a lead, not as text to paste in: write the entry yourself and open every link
before you add it.

1. Check that the source exists and says what the issue says. Read the paper, not only the
   abstract. The ground rules in CONTRIBUTING.md apply to maintainers too.
2. For a paper, look up the title, authors and year from the DOI or arXiv id. For a DOI,
   `curl -s https://api.crossref.org/works/<doi> | jq '.message | {title, author, issued}'`
   prints them.
3. Write the entry in [`src/data/literature.yaml`](src/data/literature.yaml):
   - `id` is the citation key: the first author's surname, the first three title words with
     capitals, and the year, such as `donatiFutureArtificialIntelligence2022`. Zotero with
     Better BibTeX makes the same key.
   - `blurb` comes from the "Why read it?" answer, in your own words.
   - Map the dropdown labels back to tag keys in [`src/data/tags.ts`](src/data/tags.ts). An
     answer under "Does it fill a gap on the map?" may ask for a new tag. Add it with this first
     entry, as CONTRIBUTING.md describes.
   - Set `type`, and `added` to this month (`YYYY-MM`). A tool with no checked date gets the
     month the issue was opened.
4. Run `npm test`. It checks every field, tag and reference.
5. Open a pull request with `Closes #<issue>` in its description, and thank the person who
   suggested it.

If a suggestion doesn't hold up, say why in the issue and close it.

## Routine

- **Dependencies.** Renovate opens one pull request a month for minor and patch updates and
  merges it once CI passes. Majors wait for a maintainer. Everything it plans is on the
  Dependency Dashboard issue.
- **Links.** The weekly link check ([`links.yml`](.github/workflows/links.yml)) opens one issue,
  or updates the open one, when a link on the site or a DOI in `literature.yaml` breaks. It
  doesn't check README.md or this file. Publishers that block crawlers answer 403 or 429, and
  the check counts those as fine.
- **Stale entries.** Tool entries carry the month they were checked. Recheck any older than a
  year: `rg -n 'checked 20' src/content/docs/tools/` lists them.

## What's tied to the owner's account

GitHub moves the issues, pull requests, history and secrets with the repo, and redirects the
repo's old URLs. It does not redirect the GitHub Pages site
([GitHub's transfer guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)).
Check the rest after a move.

| What | Where | After a move |
| --- | --- | --- |
| GitHub Pages | Settings → Pages, source "GitHub Actions" and the custom domain | Check both came across. |
| Domain verification | The owner's Settings → Pages (an account or an organization) | Verification belongs to the account. Verify the domain under the new owner before the move. |
| Branch rules (`protect-main`) | Settings → Rules | Check they came across. They require the `check` and `build` jobs and block force pushes and deletion. Admins can bypass them. |
| Code scanning (CodeQL) | Settings → Code security | Check it's still on. |
| Renovate | The Renovate GitHub app, installed per account | Install the app on the new owner and give it this repo. Keep Dependabot alerts on: Renovate reads them. |
| Coverage (Codecov) | codecov.io, uploads without a token | Add the repo under the new owner, then fix the badge in README.md. |
| Discord invite | `astro.config.mjs`, the home page, README.md, CONTRIBUTING.md, [`config.yml`](.github/ISSUE_TEMPLATE/config.yml) | The invite can expire. A Discord admin can make a permanent one. |

For a move, set `owner` in [`src/site.ts`](src/site.ts), and fix the badges in README.md and
the repo's "Website" field.

## Setting up a custom domain

[`src/site.ts`](src/site.ts) holds the custom domain. The site address, the base path, the
social card, the edit links and the accessibility check all follow it. The steps follow
[GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site),
with the DNS at Cloudflare.

1. **Verify the domain** for the account that owns the repo: Settings → Pages → Add a domain.
   GitHub shows a TXT record. Add it in Cloudflare, then click Verify. A verified domain can't be
   taken over by another GitHub user's site, so the DNS records can go in before the repo uses
   the domain.
2. **Add the DNS records** in Cloudflare, each set to "DNS only" (a grey cloud). Cloudflare's
   proxy gets in the way of GitHub's certificate. Never add a wildcard record (`*`).

   | Type | Name | Content |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (one record each) |
   | AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` (one record each) |
   | CNAME | `www` | `<owner>.github.io`, without the repo name |

3. Wait until `dig +short <domain>` prints GitHub's four addresses. It can take up to a day.
4. **Switch.** Open a pull request that sets `domain` in `src/site.ts` and changes the live-site
   links in README.md and CONTRIBUTING.md. Once its CI passes, enter the domain under the repo's
   Settings → Pages → Custom domain, then merge straight away. Until the deploy finishes, a few
   minutes, the site shows unstyled. No `CNAME` file is needed: the Actions deploy ignores one.
5. Wait for GitHub's certificate, then turn on "Enforce HTTPS". The certificate can take a while.
6. Check the live site, an old address (`<owner>.github.io/<repo>/tools/` should land on
   `<domain>/tools/`), and the link preview of the address pasted into a chat.

The 404 page forwards old paths that still carry the repo name to the same page at the root.

To roll back, revert the pull request from step 4 and clear the custom domain once the revert
has deployed. Keep the DNS records until the old address works again. If the Pages site is ever
switched off or the repo deleted, remove the DNS records too: a domain that points at GitHub
Pages with no site behind it can be taken over.
