# AGENTS.md

Scope: `.github`

## Workflow map

- `workflows/ci.yml`: builds the docs site and Docker images in CI
- `workflows/docs-pages.yml`: publishes `docs/` to GitHub Pages on pushes to `main`
- `workflows/deploy.yml`: release-driven deployment to Google Cloud Run

## Change guidance

- Keep trigger paths tight so docs-only changes do not accidentally expand unrelated workflows.
- If docs publishing behavior changes, update `docs/AGENTS.md` and the product docs only if the published user experience changed.
- If release or CI expectations change for contributors, update the root `AGENTS.md`.

## Practical checks

- docs pipeline changes: run `pnpm docs:build`
- package manager or lockfile changes: check both `ci.yml` and `docs-pages.yml`
- deployment changes: inspect `deploy.yml` end to end before editing only one job
