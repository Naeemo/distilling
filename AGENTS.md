# AGENTS.md

This file is the contributor entrypoint for humans and coding agents working in this repository.

Product-user documentation lives in `docs/`.
Contributor guidance lives in this `AGENTS.md` hierarchy.

## Repository shape

- `apps/api`: NestJS API, Prisma schema, extraction, AI, review, and graph logic
- `apps/web`: Next.js App Router frontend for the product
- `apps/extension`: Chrome extension for WeChat collection
- `docs`: VitePress product documentation site
- `.github/workflows`: CI, docs publishing, and release deployment automation

## Working agreement

1. Start in the narrowest package that owns the behavior.
2. Change the canonical source, not generated output.
3. Run the smallest meaningful verification before broadening.
4. Update documentation in the same turn when product behavior or contributor workflow changes.

## Documentation split

Keep these systems separate:

- `docs/`: product-user documentation, written as if the reader uses the product
- `AGENTS.md` files: contributor guidance, repo boundaries, commands, and implementation notes

If a change affects both audiences, update both systems independently instead of merging them back together.

## Repo-wide rules

- Use pnpm workspace commands.
- Do not commit generated JavaScript next to TypeScript source.
- Keep extension build output in `apps/extension/dist`.
- Do not add local tracker files, editor state, or ad hoc report dumps to the repo root.
- Prefer small, explicit diffs over broad cleanup unless the task is specifically a cleanup pass.

## Common commands

```bash
nvm use
pnpm install
pnpm dev
pnpm dev:local
pnpm setup:local
pnpm infra:up
pnpm infra:down
pnpm build
pnpm type-check
pnpm lint
pnpm verify:changed
pnpm docs:dev
pnpm docs:build
```

Database helpers:

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

## Verification defaults

- API-only changes: `pnpm --filter @infodigest/api type-check`
- web-only changes: `pnpm --filter @infodigest/web type-check`
- extension-only changes: `pnpm --filter @infodigest/extension build`
- docs-only changes: `pnpm docs:build`
- changed-scope local iteration: `pnpm verify:changed`
- broad changes: `pnpm type-check` and `pnpm lint`

## Where to look next

- API guidance: `apps/api/AGENTS.md`
- web guidance: `apps/web/AGENTS.md`
- extension guidance: `apps/extension/AGENTS.md`
- docs guidance: `docs/AGENTS.md`
- workflow guidance: `.github/AGENTS.md`
