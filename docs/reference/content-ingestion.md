# Content Ingestion

InfoDigest supports multiple ingestion paths. They are not equivalent, and contributors should preserve that distinction.

## Primary ingestion paths

### 1. Web app quick collect

Users can submit:

- a normal URL
- a shared WeChat URL
- copied plain text
- lightweight pasted share payloads

This is the simplest and most universal path.

### 2. API extraction

The API owns the extraction and persistence logic.

Relevant backend modules:

- `content`
- `browser`
- `ai`

The browser module uses Playwright for pages that are difficult to extract reliably with plain HTTP parsing.

### 3. Chrome extension

The extension is the best in-browser path for WeChat collection because it runs in a real browser context and can read the currently open page.

Main pieces:

- `background.ts`: API communication and token lifecycle
- `content.ts`: page extraction
- `popup.ts` and `popup.html`: user interaction

### 4. iOS shortcut

There is a sample shortcut configuration available at:

- [/assets/ios-shortcut-config.json](/assets/ios-shortcut-config.json)

This is a reference artifact rather than a full productized mobile app flow.

## WeChat-specific notes

WeChat article extraction is inherently less stable than ordinary web extraction.

Current practical position:

- browser-context collection is preferred when available
- pasted URLs should still work as a baseline path
- anti-bot behavior may require Playwright or user-assisted collection

## Source type expectations

Use these `SourceType` values consistently:

- `WEB`
- `RSS`
- `NEWSLETTER`
- `MANUAL`

Do not invent a new source type without updating the Prisma schema and downstream consumers.

