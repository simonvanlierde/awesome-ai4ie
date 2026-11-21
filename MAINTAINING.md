# Maintaining

Maintainer: Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)). A second
maintainer from the AI4IE working group is wanted. [`.github/CODEOWNERS`](.github/CODEOWNERS)
asks the maintainers to review every pull request. Until there are two of us, that request is
advisory.

## Turning a form into an entry

Find suggestions under the `entry` label. The forms also label papers, applications, tools
and resources by type.

1. Open each link and check the claims against the source. For papers, read the full text.
   Follow the [ground rules](CONTRIBUTING.md#ground-rules).
2. For a paper, look up the title, authors and year from the DOI or arXiv id. For a DOI,
   `curl -s https://api.crossref.org/works/<doi> | jq '.message | {title, author, issued}'`
   prints them.
3. Write the entry. A paper goes in [`src/data/literature.yaml`](src/data/literature.yaml):
   - `id` is the citation key: the first author's surname, the first three title words with
     capitals, and the year, such as `donatiFutureArtificialIntelligence2022`. Zotero with
     Better BibTeX makes the same key.
   - Write a `blurb` that explains what the paper shows.
   - Map the dropdown labels back to tag ids in [`src/data/vocabulary.yaml`](src/data/vocabulary.yaml). An
     answer under "Does it fill a gap on the map?" may ask for a new tag. Add it with this first
     entry, as CONTRIBUTING.md describes.
   - Set `type`, and set `added` to this month (`YYYY-MM`).

   An application goes in [`src/data/applications.yaml`](src/data/applications.yaml), with the
   same tags. A tool, dataset, model or other resource goes in
   [`src/data/resources.yaml`](src/data/resources.yaml): set `kind`, and for a tool its `group`
   (the list it sits in on the tools pages), `cost` and `data`. Set `checked` to the month you
   opened the link, or the month the issue was opened if it gives no date.
4. For a paper, run `pnpm run citations` if the contributor hasn't fetched its records.
   The command saves BibTeX and RIS from Crossref or arXiv in
   [`src/data/citations.json`](src/data/citations.json). Include the updated cache with the
   entry when available. If the fetch fails, check the message and retry later. The export
   uses the YAML entry until the full record is available.
5. Run `pnpm test`. It checks every field, tag and reference.
6. Open a pull request with `Closes #<issue>` in its description, and thank the person who
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
- **Weekly candidates.** Every Monday [`candidates.yml`](.github/workflows/candidates.yml) asks
  OpenAlex for new papers that pair an AI term with an industrial-ecology term. In the core
  industrial-ecology journals, a method term alone is enough. It adds up to 25 leads to
  `src/data/candidates.yaml` on the `openalex-candidates` branch, with one open pull request.
  Each run comments its counts there, and warns when its leads score low.
  Each lead carries a `score` (closeness to listed papers minus closeness to rejected leads,
  from a small local embedding model), the ids of its `near`est listed papers, and the tags
  those share as `hints`. Open leads come first, best score first, and every run re-scores
  them. Leads below the score of the least typical 6% of listed papers are left out. For
  each lead, read the paper against the scope in [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-paper-an-application-or-a-resource):
  add it to `literature.yaml` and set `status: listed`, or set `status: rejected` with a
  one-line `why`. Keep rejected leads, so the job never proposes them
  again. A pull request opened by the workflow token starts no checks: close and reopen it to
  run CI, then merge. The `OPENALEX_API_KEY` secret is optional (a free key from
  openalex.org/settings/api raises the daily budget). The repository setting *Allow GitHub Actions to
  create and approve pull requests* (Settings, Actions, General) must be on. To catch up on a
  longer gap, run `node scripts/openalex-candidates.mjs --since <date> --limit <n>` locally.
- **Meaning search quality.** After changing `src/data/search-eval.yaml`, the embedding model or
  `MIN_SCORE`, run `pnpm run embed && pnpm run search-eval` with `CLOUDFLARE_ACCOUNT_ID` and
  `CLOUDFLARE_API_TOKEN` (a token with Workers AI: Read) set. Tune `MIN_SCORE` on the tuning
  half only, and set `HIT1_MIN` and `MRR_MIN` in `scripts/lib/eval-metrics.mjs` just below the
  held-out scores it prints.
- **Citation records.** After a publisher corrects a record at Crossref, run
  `pnpm run citations -- --refresh` and review the diff of `src/data/citations.json` before
  you commit it.
- **Every October.** Move `Expires` in [`public/.well-known/security.txt`](public/.well-known/security.txt)
  a year on (an expired file is invalid), and review the
  [accessibility statement](src/content/docs/accessibility.md) and its date.
- **Stale entries.** Recheck tool entries older than a year. Find the dates with
  `rg -n 'checked:' src/data/resources.yaml`.
- **Page weight.** CI fails a page that goes over its budget in
  [`scripts/page-weight.mjs`](scripts/page-weight.mjs). Raise `DEFAULT_BUDGET_KB` or a page's
  `OVERRIDES` entry only for a reason you can name in the pull request.
- **Citation files.** `CITATION.cff` is the source for `codemeta.json` and `.zenodo.json`. After
  a change of author, edit it and run `pnpm exec prek run citesync-write --stage manual --all-files`.
- **Social card.** `public/og.png` is a picture of the logo, the title, the site description and Fig. 1, so it goes stale when
  any of them changes. Rebuild it with `pnpm run build`, `pnpm exec astro preview`
  and then `pnpm run og-card`, and commit the PNG. The `?v=` hash in the og:image URL is computed from the PNG at build time, so there is nothing to bump.

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
   GitHub shows a TXT record. Add it in Cloudflare, then click Verify. No other GitHub user can
   publish a site on a verified domain, so the DNS records can go in before the repo uses it.
2. **Add the DNS records** in Cloudflare, each set to "DNS only" (a grey cloud). Cloudflare's
   proxy gets in the way of GitHub's certificate. Never add a wildcard record (`*`).

   | Type | Name | Content |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (one record each) |
   | AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` (one record each) |
   | CNAME | `www` | `<owner>.github.io`, without the repo name |

3. Wait until `dig +short <domain>` prints GitHub's four addresses. It can take up to a day.
4. **Switch.** From the next two actions until the deploy finishes, a few minutes, the site
   shows unstyled. Open a pull request that sets `domain` in `src/site.ts` and changes the
   live-site links in README.md and CONTRIBUTING.md. Once its CI passes, enter the domain under
   the repo's Settings → Pages → Custom domain. Then merge straight away. No `CNAME` file is
   needed: the Actions deploy ignores one.
5. Wait for GitHub's certificate, then turn on "Enforce HTTPS". The certificate can take a while.
6. Check the live site, an old address, and the link preview of the address pasted into a
   chat. GitHub forwards `<owner>.github.io/<repo>/tools/` to `<domain>/tools/`, so old links
   keep working while the repo stays with the same owner.

To roll back, revert the pull request from step 4. Once the revert has deployed, clear the custom
domain. Keep the DNS records until the old address works again. If the Pages site is ever
switched off or the repo deleted, remove the DNS records too. Another GitHub user can take over
a domain that points at GitHub Pages with no site behind it.

### Moving the domain to the Worker

The steps above point the domain at GitHub Pages. To serve `/api/*` and `/mcp`, the domain has to
go to the Worker instead, as a Workers custom domain (a zone on the same Cloudflare account).

1. Remove the GitHub Pages custom domain (Settings → Pages) and the four `A`, four `AAAA` and
   `www` records from the table above. A custom domain cannot be added over existing records.
2. Add the domain to the Worker: Cloudflare dashboard → Workers & Pages → `awesome-ai4ie` →
   Settings → Domains & Routes → Add → Custom domain. Cloudflare creates the DNS record and the
   certificate.
3. Check that `curl -sI https://<domain>/` no longer says `server: GitHub.com`, and that a `POST` to
   `https://<domain>/mcp` with `Accept: application/json, text/event-stream` returns 200, not 405.
4. Change the Worker address to the domain in README.md and in the "Ask an AI assistant" section
   of `src/content/docs/literature.mdx`.

To roll back, delete the Worker's custom domain and redo the Pages steps.

### Contributions and poll setup

The on-site contribution form (`POST /api/contribute`) and norms poll (`GET`/`POST /api/poll`)
require one KV namespace, one build-time site key, and two Worker secrets. Without them, both
endpoints return `503` and the page falls back to GitHub Issues and Discord links.

1. **Create the KV namespace.** Run `pnpm exec wrangler kv namespace create POLL_KV` (and a
   second namespace for previews if desired). Paste the returned 32-character hex id into
   `kv_namespaces` and `previews.kv_namespaces` in [`wrangler.jsonc`](wrangler.jsonc), replacing
   the placeholder zeros.
2. **Create a Cloudflare Turnstile widget** (Cloudflare dashboard → Turnstile → Add widget,
   hostname `ai4ie.org`, Managed or Non-interactive mode):
   - Set the public site key as `PUBLIC_TURNSTILE_SITE_KEY` in the Astro build environment
     (GitHub repository variable or local `.env`).
   - Store the secret key on the Worker: `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY`.
3. **Create a fine-grained GitHub PAT** scoped only to `simonvanlierde/awesome-ai4ie` with
   `Issues: Read and write` (no other permissions), and store it on the Worker:
   `pnpm exec wrangler secret put GITHUB_ISSUES_TOKEN`.
   Create the labels `community-submission`, `golden-question`, `ai-mistake`, and
   `community-comment` in the repository if they do not exist yet (`entry` already exists).
