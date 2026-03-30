# Troubleshooting

## I saved something, but I do not see useful content yet

Try these checks:

- refresh the dashboard list
- open the item directly from the dashboard
- confirm that the source URL is reachable
- if you pasted text, remember it is stored directly rather than extracted from a page

## A WeChat link did not extract well

WeChat collection is more fragile than ordinary web extraction.

Best fallback order:

1. use the [Browser Extension](/platforms/browser-extension)
2. paste the full WeChat share text into Quick Collect
3. save the important text manually if extraction is still incomplete

## The extension says I am not logged in

The expected fix is to sign in on the web app first and then reopen the extension popup.

The extension depends on token sync from the web app session.

## The extension opens, but save still fails

Check whether:

- the current tab is a supported WeChat article page
- the page finished loading before you opened the popup
- the article structure is unusually customized

## I only want to save my own notes

Use Quick Collect in text mode or paste plain text or Markdown in auto-detect mode.

That path avoids page extraction entirely.

## I am on mobile and do not want to install anything

The simplest path is still:

1. copy a link or share text
2. open the web app
3. paste it into Quick Collect
