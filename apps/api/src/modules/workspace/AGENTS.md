# AGENTS.md

Scope: `apps/api/src/modules/workspace`

## What this module owns

- workspace article CRUD
- reference retrieval from the user's content library
- async article generation orchestration
- workspace-specific response shaping

## Change guidance

- Keep `WorkspaceService` focused on request lifecycle and persistence.
- Put retrieval, prompting, parsing, and generation fallback logic in `WorkspaceGenerationService`.
- When schema or response fields change, update web types and product docs in the same turn.

## Verification

```bash
pnpm --filter @infodigest/api test -- src/modules/workspace/workspace.service.spec.ts src/modules/workspace/workspace-generation.service.spec.ts
pnpm --filter @infodigest/api type-check
```
