# Maintaining

Maintainer: Simon van Lierde ([@simonvanlierde](https://github.com/simonvanlierde)). A second
maintainer from the AI4IE working group is wanted. [`.github/CODEOWNERS`](.github/CODEOWNERS)
asks the maintainers to review every pull request. Until there are two of us, that request is
advisory.

## Turning a form into an entry

Find suggestions under the `entry` label and other on-site submissions under
`community-submission`.

1. Check the claim against its source. For papers, read the full text. Apply the
   [ground rules](CONTRIBUTING.md#ground-rules).
2. Put an accepted suggestion in the corresponding [data file](src/data/). Follow the
   [entry requirements](CONTRIBUTING.md#adding-a-paper-an-application-or-a-resource) and
   [tag vocabulary](CONTRIBUTING.md#the-tag-vocabulary). For papers, use the Better BibTeX
   citation key, such as `donatiFutureArtificialIntelligence2022`.
3. For a new paper, run `pnpm run citations` and include the updated cache if the record
   is available. Run `pnpm test` before opening the pull request.
4. Add `Closes #<issue>` to the pull request and thank the person who suggested the entry.
   If you decline a suggestion, explain why on the issue before closing it.

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
- **Demo download sizes.** `DEMO_DOWNLOAD` in [`src/lib/footprint.mjs`](src/lib/footprint.mjs) holds
  hand-copied file sizes. Refresh them when the demo model or the transformers.js or
  onnxruntime-web version changes.
- **Citation files.** `CITATION.cff` is the source for `codemeta.json` and `.zenodo.json`. After
  a change of author, edit it and run `pnpm exec prek run citesync-write --stage manual --all-files`.
- **Social card.** `public/og.png` is a picture of the logo, the title, the site description and Fig. 1, so it goes stale when
  any of them changes. Rebuild it with `pnpm run build`, `pnpm exec astro preview`
  and then `pnpm run og-card`, and commit the PNG. The `?v=` hash in the og:image URL is computed from the PNG at build time, so there is nothing to bump.

## What's tied to the owner's account

GitHub moves the issues, pull requests, history and secrets with the repo and redirects the
old repository URLs. The GitHub Pages mirror URL needs its own check
([GitHub's transfer guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)).
Check the rest after a move.

| What | Where | After a move |
| --- | --- | --- |
| Cloudflare Worker | Cloudflare dashboard, Worker bindings, secrets, and custom domain | Check the deploy credentials and domain. Keep the poll's Durable Object storage. |
| GitHub Pages mirror | Settings → Pages, source "GitHub Actions" | Check the static mirror URL. |
| Branch rules (`protect-main`) | Settings → Rules | Check they came across. They require the `check` and `build` jobs and block force pushes and deletion. Admins can bypass them. |
| Code scanning (CodeQL) | Settings → Code security | Check it's still on. |
| Renovate | The Renovate GitHub app, installed per account | Install the app on the new owner and give it this repo. Keep Dependabot alerts on: Renovate reads them. |
| Coverage (Codecov) | codecov.io, uploads without a token | Add the repo under the new owner, then fix the badge in README.md. |
| Discord invite | `astro.config.mjs`, the home page, README.md, CONTRIBUTING.md, [`config.yml`](.github/ISSUE_TEMPLATE/config.yml) | The invite can expire. A Discord admin can make a permanent one. |

For a move, set `owner` in [`src/site.ts`](src/site.ts), and fix the badges in README.md and
the repo's "Website" field.

## Setting up a custom domain

Cloudflare Workers serves `ai4ie.org`, including `/api/*` and `/mcp`. CI also deploys a
static mirror to GitHub Pages.

For a domain change, update the Worker custom domain under **Settings → Domains & Routes** and
set `domain` in [`src/site.ts`](src/site.ts). Use the
[Cloudflare custom-domain guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
After deploy, check the home page, `/mcp`, and `/api/poll` on the new host.

### Contributions and poll setup

Keep these values in sync when rotating credentials or moving the Worker.

| Setting | Where |
| --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | GitHub repository variable. CI puts it in the browser build. |
| `TURNSTILE_SECRET_KEY` | Worker secret. Use the secret for the same widget and allow the public hostname in its settings. |
| `GITHUB_ISSUES_TOKEN` | Worker secret. Use a fine-grained token with **Issues: Read and write** on this repository. |

Set Worker secrets with `pnpm exec wrangler secret put <NAME>`. Use Cloudflare's
[Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
for local builds. The deploy provisions poll storage. Each preview has its own poll.

After a change, open `/contribute/` and check that the poll shows counts and the form starts
verification. With JavaScript disabled, check that both sections offer GitHub Issues and Discord
links. If submitted issues lose their labels, check `entry`, `community-submission`,
`golden-question`, `ai-mistake`, and `community-comment` in GitHub.
