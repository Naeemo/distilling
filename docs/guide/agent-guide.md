# Agent Guide

This page is written for coding agents and automated contributors.

## Fast mental model

- the API is the system of record
- Prisma schema changes ripple into API type-check
- the web app is a typed client over API routes
- the extension is a separate build target with its own manifest constraints
- the docs site is built from `docs/` using VitePress

## High-signal repo facts

- package manager: pnpm workspace
- task runner: Turborepo
- backend framework: NestJS
- frontend framework: Next.js App Router
- browser automation: Playwright
- database: PostgreSQL via Prisma
- cache and queue-like support: Redis

## Safe default workflow for agents

1. inspect the relevant package and file boundary
2. update only the canonical code path
3. run the narrowest useful verification
4. if architecture or process changed, update docs in the same turn

## File ownership hints

### If the change is about ingestion

Look at:

- `apps/api/src/modules/content`
- `apps/api/src/modules/browser`
- `apps/extension/src`
- `apps/web/components/QuickCollect.tsx`

### If the change is about auth or token flow

Look at:

- `apps/api/src/modules/auth`
- `apps/web/stores/auth.ts`
- `apps/extension/src/background.ts`

### If the change is about graph or analysis

Look at:

- `apps/api/src/modules/knowledge-graph`
- `apps/api/src/modules/analysis`
- `apps/api/src/modules/output`
- `apps/web/components/knowledge-graph`
- `apps/web/app/knowledge-graph`

## Known gotchas

- API typing depends on a generated Prisma client.
- Extension source must stay TypeScript-first; compiled artifacts are not source files.
- Web local development relies on Next.js rewrites to the API.
- Historical report files were intentionally removed from docs because they went stale quickly.
- GitHub Pages deployment requires the repository Pages source to be set to `GitHub Actions`.

## What to avoid

- adding new status dump files under the repo root
- writing docs as time-stamped progress snapshots unless the user explicitly asks for a report artifact
- introducing another parallel docs structure outside `docs/`

