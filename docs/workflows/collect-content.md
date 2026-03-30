# Collect Content

InfoDigest supports several collection paths. They are useful in different situations.

## Choose the right path

| Situation | Best path |
| --- | --- |
| Normal article or blog post | Web app Quick Collect |
| WeChat article already open in Chrome | Browser extension |
| Copied note, transcript, or Markdown | Web app Quick Collect in text mode |
| Share-driven mobile capture | iOS shortcut or paste into the web app |

## Web app Quick Collect

Quick Collect is the default path for most users.

You can paste:

- a standard URL
- a WeChat article URL
- a block of WeChat share text
- plain text
- Markdown

InfoDigest detects the input and decides whether to fetch a page or save text directly.

## Browser extension

Use the extension when a WeChat article is already open in your browser.

Why it matters:

- it works in the real page context
- it can read article content directly from the tab
- it reduces the friction of copying links back into the web app

The extension works best after you have already logged in on the web app.

Read [Browser Extension](/platforms/browser-extension) for the exact flow.

## iOS shortcut flow

The repository includes an iOS shortcut reference configuration for lightweight mobile capture.

Use it when:

- you want to pass a link or share payload from iOS
- you are comfortable with a shortcut-based setup and a per-account Integration Token
- you do not need a dedicated native app

Read [Mobile Shortcut](/platforms/mobile-shortcut) for details.

## What happens after collection

After an item is created, it appears in your library and can move into the rest of the product flow:

- reading
- highlighting
- tagging
- summarization
- review
- graph exploration

## Practical advice

- Use URLs when you want full article extraction.
- Use pasted text when you want to preserve notes exactly as written.
- Use the extension for WeChat when direct extraction is unreliable from a copied link alone.
