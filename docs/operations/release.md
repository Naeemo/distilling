# Release Process

## Current release trigger

Production deployment is release-driven.

`.github/workflows/deploy.yml` runs on:

- `release.published`
- manual `workflow_dispatch`

## Recommended release checklist

1. merge the final changes into `main`
2. make sure `pnpm type-check`, `pnpm lint`, and any targeted package checks pass
3. verify docs build with `pnpm docs:build`
4. create a GitHub release
5. watch the deploy workflow complete API deploy, migration job, and frontend deploy
6. smoke test the deployed API, web app, and docs site

## What a release does today

When a release is published:

- the API image is tagged and pushed
- the API service is deployed to Cloud Run
- a migration job is created or updated and executed
- the frontend image is built with the deployed API URL
- the frontend service is deployed to Cloud Run
- the API service CORS origin is updated to the deployed frontend URL

## Docs release behavior

Documentation deployment is not tied to GitHub Releases.

Docs publish automatically on pushes to `main` through `docs-pages.yml`.

That means:

- product release: explicit GitHub release
- docs release: merge to `main`

## When to cut a release

Good release candidates usually include:

- matching code and docs
- no known broken type-check paths
- migration compatibility reviewed if Prisma changed
- extension build still working if collection paths were touched

