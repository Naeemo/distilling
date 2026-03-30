# AGENTS.md

Scope: `docs`

## What this directory is for

`docs/` is the public product documentation site built with VitePress.

Write for:

- end users
- evaluators
- operators using the product itself
- user-end agents acting like product users

Do not write these pages as maintainer runbooks.

## Content rules

- Explain what the product does and how to use it.
- Avoid repo-internal file paths unless they materially help a product user.
- Prefer workflows, expectations, and troubleshooting over implementation detail.
- Keep contributor guidance in `AGENTS.md` files instead.

## Structural rules

- Update `docs/.vitepress/config.ts` when adding, removing, or renaming pages.
- Put public downloadable assets in `docs/public/`.
- Keep the site navigable from the homepage and sidebar alone.

## Commands

```bash
pnpm docs:dev
pnpm docs:build
```

## When docs need updates

- any user-visible workflow changed
- supported input types changed
- extension or mobile collection behavior changed
- the product navigation model changed
