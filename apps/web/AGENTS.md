# AGENTS.md

Scope: `apps/web`

## What this package owns

The web app is the main product surface for:

- login and registration
- session management and BFF auth
- dashboard and Quick Collect
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
- Keep product wording and product-user docs aligned when UI behavior changes.
- Prefer small, route-scoped edits over sweeping UI refactors unless the task is explicitly a redesign.

## Commands

```bash
pnpm --filter @infodigest/web type-check
pnpm --filter @infodigest/web build
```

## Gotchas

- Local frontend API calls default to `/api/v1`, which is now handled by Next.js route handlers that forward to the internal Nest API.
- Better Auth owns browser sessions in this package; do not reintroduce browser-managed JWT refresh logic.
- Quick Collect accepts URLs, WeChat shares, plain text, and Markdown.
- The knowledge graph explore route is large and easy to destabilize with broad refactors.

## When to update docs

- Product usage changes: update `docs/`
- Contributor boundary changes for the web package: update this file
