# Browser Extension

The browser extension is the best path for saving WeChat articles from a real browser tab.

## What it does well

Compared with copying a link manually, the extension can:

- inspect the currently open page directly
- extract article title, author, text, cover image, and publish time
- send the result into InfoDigest with less copy-paste work

## Best use case

Use the extension when:

- you already have a WeChat article open in Chrome
- direct URL extraction is unreliable or incomplete
- you want the lowest-friction path from reading to saving

## Preferred auth model

The extension is designed around web-to-extension Integration Token sync managed by the web app session.

Recommended flow:

1. Log in on the InfoDigest web app.
2. Open the extension.
3. Let the web app session sync an Integration Token.
4. Save the current WeChat article from the popup.

The extension should not be treated as a separate standalone login surface.

## Current packaging status

In this repository, the extension is developer-loaded rather than published through a browser store.

That means the practical setup is:

1. build the extension
2. open `chrome://extensions/`
3. enable developer mode
4. load the `apps/extension` directory

## Common issues

- If the extension says you are not logged in, sign in again on the web app first.
- If extraction fails, confirm that the active tab is a WeChat article page.
- If the popup loads but cannot save, the page may not match the supported article structure.

For more help, read [Troubleshooting](/reference/troubleshooting).
