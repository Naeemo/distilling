# Contributing

## Contribution priorities

The most useful changes in this repo tend to be:

- fixing broken runtime or typing paths
- keeping generated output out of source directories
- improving docs when behavior changes
- preserving module boundaries instead of adding cross-cutting shortcuts

## Ground rules

- use pnpm workspace commands, not ad hoc npm installs in subprojects
- do not commit generated JS next to TypeScript source
- update docs when changing architecture, workflows, or deploy behavior
- avoid introducing local task tracker files or editor-specific state
- prefer small, explicit diffs over speculative cleanup

## Where to make common changes

| Task | Likely home |
| --- | --- |
| API endpoint or domain behavior | `apps/api/src/modules/**` |
| schema or enums | `apps/api/prisma/schema.prisma` |
| reader or dashboard UI | `apps/web/app/**` and `apps/web/components/**` |
| extension extraction flow | `apps/extension/src/**` |
| docs or onboarding | `docs/**` |
| deployment automation | `.github/workflows/**` |

## When touching docs

Prefer updating the canonical page instead of adding a new one-off report.

Examples:

- deployment change: update `operations/deployment.md`
- release process change: update `operations/release.md`
- new subsystem: add or extend a page under `reference/`

## When touching CI or deploy workflows

Check both:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

If the change affects documentation publishing, also check:

- `.github/workflows/docs-pages.yml`
- `docs/.vitepress/config.ts`

