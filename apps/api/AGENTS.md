# AGENTS.md

Scope: `apps/api`

## What this package owns

The API is the system of record for:

- authentication
- content ingestion and retrieval
- highlights, tags, and review data
- AI summarization and analysis
- knowledge graph data and related outputs

## Important directories

- `src/modules/auth`
- `src/modules/content`
- `src/modules/browser`
- `src/modules/ai`
- `src/modules/analysis`
- `src/modules/highlight`
- `src/modules/tag`
- `src/modules/review`
- `src/modules/knowledge-graph`
- `src/modules/output`
- `prisma/schema.prisma`

## Change guidance

- Keep controller, service, DTO, and frontend API assumptions aligned.
- Put durable model changes in `prisma/schema.prisma`.
- Treat `browser` as the home for extraction logic that needs a real browser context.
- Keep provider-specific AI code behind the existing AI service layer when possible.

## Commands

```bash
pnpm --filter @infodigest/api type-check
pnpm --filter @infodigest/api build
pnpm --filter @infodigest/api test
```

## Gotchas

- `type-check` runs `prisma generate` first; expect generated client output to matter for types.
- Prisma schema changes ripple into multiple modules quickly.
- Ingestion changes often affect web, extension, and docs at the same time.
- LLM runtime config falls back to `LLM_*` env vars when database-backed system config rows are absent; use that path for local Ollama development.

## When to update docs

- Product behavior changes: update `docs/`
- Contributor workflow or file-boundary changes: update this file or the root `AGENTS.md`
