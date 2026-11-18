# Security

<!-- The advisories link below works only once Settings > Code security >
     Private vulnerability reporting is on. -->

## Report a vulnerability

Report it privately, through
[a GitHub security advisory](https://github.com/simonvanlierde/awesome-ai4ie/security/advisories/new)
or by email to <code@duinlab.nl>. Don't open a public issue or pull request for it:
anyone can read those before there is a fix.

Please include:

- What the problem is and where it is: a file, a function or a dependency.
- Steps to reproduce it, or a proof of concept.
- The impact you expect, and the commit or page you saw it in.

I acknowledge a report within 14 days, then tell you whether I can reproduce it and when I
expect a fix.

## Fixes and disclosure

The site deploys from `main`, so a fix is live once it is merged. Then I publish the GitHub
security advisory for it, with a CVE where one applies, and credit you unless you'd rather not
be named.

## Scope

This is a static site with no server, accounts or stored user data. One page runs a model in the
visitor's browser, loaded from jsDelivr and Hugging Face.

In scope:

- The code in this repository and what it builds.
- The CI workflows in `.github/workflows`.
- The dependencies in the lockfiles, when the problem affects this project.

Out of scope:

- A problem in a dependency that doesn't affect this project. Report it upstream.
- A missing HTTP header that GitHub Pages cannot send, such as `Strict-Transport-Security`.
