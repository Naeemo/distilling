# AGENTS.md

Scope: `apps/web`

## What this package owns

The web app is the main product surface for:

- login and registration
- session management and BFF auth
- feeds and Quick Collect
- workspace article drafting and editing
- reading
- review
- knowledge graph browsing

## Important directories

- `app`: route-level surfaces
- `components`: shared and feature UI
- `hooks`: reusable frontend logic
- `stores`: Zustand state
- `lib`: API client and helpers
- `types`: frontend-facing types

## Change guidance

- Route changes usually need matching updates in `components`, `stores`, or `lib/api.ts`.
- Keep `feeds` and `workspace` as distinct user flows even if they share layout chrome.
- Keep product wording and product-user docs aligned when UI behavior changes.
- Prefer small, route-scoped edits over sweeping UI refactors unless the task is explicitly a redesign.

## Commands

```bash
pnpm --filter @infodigest/web type-check
pnpm --filter @infodigest/web build
```

## Gotchas

- Local frontend API calls default to `/api/v1`, which is now handled by Next.js route handlers that forward to the internal Nest API.
- Web `dev` / `build` / `type-check` now use the shared Prisma sync helper (`scripts/prisma-generate-if-needed.mjs`) to avoid redundant `prisma generate` runs.
- Better Auth owns browser sessions in this package; do not reintroduce browser-managed JWT refresh logic.
- Quick Collect accepts URLs, WeChat shares, plain text, and Markdown.
- Workspace pages rely on debounced autosave and async generation states; avoid optimistic UI that can overwrite server-generated drafts.
- The knowledge graph explore route is large and easy to destabilize with broad refactors.

## When to update docs

- Product usage changes: update `docs/`
- Contributor boundary changes for the web package: update this file
