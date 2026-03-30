# Overview

InfoDigest is a pnpm workspace monorepo for collecting, analyzing, reading, and revisiting information.

The current repository contains three product surfaces:

- `apps/api`: NestJS API with Prisma, PostgreSQL, Redis, and AI integrations.
- `apps/web`: Next.js web app for login, collection, reading, review, admin, and knowledge graph exploration.
- `apps/extension`: Chrome extension for saving WeChat articles from a real browser context.

## What the product does

The system supports:

- account creation and JWT-based authentication
- URL and text ingestion
- article extraction and summarization
- reading progress, highlighting, and review workflows
- tags and lightweight knowledge management
- knowledge graph insights and relation analysis
- optional mobile and browser-assisted collection paths

## What is canonical in this repo

When contributing, treat these as the source of truth:

- product code: `apps/**`
- data model: `apps/api/prisma/schema.prisma`
- runtime workflows: `.github/workflows/**`
- docs site: `docs/**`

These are not canonical and should not become long-term documentation:

- one-off progress reports
- historical test reports
- local task tracker artifacts
- generated build output

## Recommended reading order

If you are new to the repo, read the docs in this order:

1. [Architecture](/guide/architecture)
2. [Development](/guide/development)
3. [Contributing](/guide/contributing)
4. [Agent Guide](/guide/agent-guide)
5. The relevant reference page for the subsystem you are changing

