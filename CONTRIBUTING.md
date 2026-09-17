# Contributing to StudyLife for Raycast

Thanks for taking the time. This is a small, single-maintainer extension, so the process is
deliberately small - but it is the same for every change, including the maintainer's own.

## How changes get in

1. Open an issue first for anything bigger than a typo or an obvious bug fix, so the direction can
   be agreed before you spend time on it. Use the templates under `.github/ISSUE_TEMPLATE/`.
2. Fork the repository (or branch, if you have write access) and make your change on a branch.
3. Open a pull request against `main`. The pull-request template asks for what changed and why.
4. `main` is protected: a PR merges only after the whole test stage of
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is green and the branch is up to date
   with `main` (enable auto-merge and it lands on its own once that is the case). Nobody pushes to
   `main` directly, not even the maintainer.

## What a pull request needs

- **Conventional Commits.** The version and the changelog are generated from the commit messages
  (`feat:` = minor release, `fix:` = patch release, `build:`/`ci:`/`docs:`/`test:` = no release).
  Squash-merge keeps the PR title as the commit message, so give the PR a Conventional Commit
  title.
- **Tests for new functionality.** The modules without Raycast dependencies (`oauth.ts`,
  `timer.ts`, `format.ts`, `courseGoals.ts`, `display.ts`, `api.ts`) hold the rules that are easy
  to get subtly wrong, and those are what `tests/` covers. A PR that adds behaviour there without
  a test is asked to add one.
- **Typecheck and lint clean.** `npm run typecheck` and `npx ray lint` both run in CI; run them
  locally before pushing.
- **Wire shapes checked against the server, not the docs.** StudyLife silently drops unknown JSON
  properties, so a wrong field name produces a green build and a control that does nothing. If a
  change touches `api.ts`, `timer.ts` or `courseGoals.ts`, check the field names against the
  actual DTOs in the [`studylife`](https://github.com/lukislp/studylife) repo
  (`StudyLife.Shared/Dtos.cs` and the relevant controller), not against this README.

## Running things locally

```bash
npm install
npm run typecheck
npm test
npx ray build     # validates the extension is Store-ready; needs no Raycast login
npx ray develop    # loads the extension into a local Raycast for manual testing
```

## Security issues

Please do not open a public issue for a vulnerability - use the private reporting path described
in [SECURITY.md](SECURITY.md).
