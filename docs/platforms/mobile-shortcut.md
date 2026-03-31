# Mobile Shortcut

InfoDigest does not currently ship a dedicated mobile app in this repository.

## What exists today

The practical mobile paths are:

- paste a link or share text into the web app
- use the iOS shortcut reference configuration included with the docs

The reference shortcut file is available here:

- [/assets/ios-shortcut-config.json](/assets/ios-shortcut-config.json)

## When to use the shortcut

Use the shortcut flow when:

- you often collect from iPhone or iPad
- you want a lightweight handoff into InfoDigest
- you are comfortable copying an Integration Token into the shortcut once

## What to expect

The shortcut is a reference artifact built on top of the same integration-token flow used for external clients.

Think of it as:

- a starting point
- a way to test mobile-friendly capture
- a bridge into the same library used by the web app

## Setup

Before using the shortcut:

1. sign in to the web app
2. open `Feeds -> Integrations`
3. generate an Integration Token
4. paste that token into the shortcut setup question

The shortcut sends requests to the Next.js app, and the Next.js app forwards them to the internal API. The Nest API is not called directly from the shortcut.

## Best fallback

If the shortcut does not fit your setup, the most reliable fallback is still:

1. copy a link or share text
2. open the web app
3. paste it into Quick Collect
