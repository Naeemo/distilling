# Mobile and Extension

## Browser extension

The Chrome extension lives in `apps/extension`.

Build facts:

- source: `src/`
- compiled output: `dist/`
- manifest entry points target `dist/`

Useful commands:

```bash
pnpm --filter @infodigest/extension build
pnpm --filter @infodigest/extension type-check
```

Manual loading flow:

1. build the extension
2. open `chrome://extensions/`
3. enable developer mode
4. load `apps/extension`

## Token sync model

The extension no longer expects manual token entry as the primary flow.

Preferred behavior:

1. log in on the web app
2. let the web app sync the token into the extension
3. save content from the extension popup

## Mobile collection

There is no first-class mobile app in this repository.

Instead, mobile collection is handled through:

- pasted URLs or text in the web app
- an iOS shortcut reference flow

The reference shortcut config is available here:

- [/assets/ios-shortcut-config.json](/assets/ios-shortcut-config.json)

## Contribution notes

If you change mobile or extension collection behavior:

- update this page
- update `reference/content-ingestion.md`
- update extension docs or examples if the build or token flow changed

