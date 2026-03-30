# AGENTS.md

Scope: `apps/extension`

## What this package owns

The extension provides browser-context collection for WeChat articles.

## Important files

- `manifest.json`
- `src/background.ts`
- `src/content.ts`
- `src/popup.ts`
- `src/popup.html`
- `tsconfig.json`

## Change guidance

- Keep authored source in `src/`.
- Keep compiled output in `dist/`.
- If an entrypoint changes, update both the build output and `manifest.json`.
- Preserve the token sync model from the web app instead of reintroducing manual token entry as the main flow.

## Commands

```bash
pnpm --filter @infodigest/extension build
pnpm --filter @infodigest/extension type-check
```

## Gotchas

- The popup assumes the user already logged in through the web app.
- The content script is tuned for WeChat article DOM structures and may need selector-safe changes.
- Extension collection changes often require updates to product docs in `docs/platforms/browser-extension.md`.
