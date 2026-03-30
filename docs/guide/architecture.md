# Architecture

## System shape

```text
Browser / Mobile / Extension
            |
            v
     Next.js web app
            |
            v
       NestJS API
            |
   +--------+--------+
   |                 |
   v                 v
PostgreSQL         Redis
   |
   v
Prisma models
```

AI-backed analysis is orchestrated from the API and currently routes through provider services such as Vertex AI and StepFun.

## Monorepo layout

```text
.
├── apps/
│   ├── api/
│   ├── extension/
│   └── web/
├── docs/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
└── turbo.json
```

## Backend architecture

The backend is organized as NestJS modules. The top-level composition lives in `apps/api/src/app.module.ts`.

Primary backend modules:

- `auth`: registration, login, JWT, API token support
- `user`: user profile access
- `content`: ingestion, content retrieval, status, reading progress
- `ai`: summarization and provider abstraction
- `browser`: Playwright-backed extraction for hard-to-scrape pages
- `highlight`: highlight and note persistence
- `tag`: tag CRUD and content tagging
- `review`: spaced repetition and review stats
- `knowledge-graph`: insights, relations, and position analysis
- `output`: higher-level adaptive output and report services
- `system-config`: operational configuration endpoints
- `sentry`: monitoring integration

## Frontend architecture

The web app uses the Next.js App Router.

Key routes under `apps/web/app`:

- `/`: landing page
- `/login`, `/register`: auth flows
- `/dashboard`: main application surface
- `/reader/[id]`: reading experience
- `/review`: review workflow
- `/knowledge-graph`: graph views
- `/knowledge-graph/explore`: interactive exploration
- `/admin`: admin tools

Supporting frontend layers:

- `components/`: shared UI and feature components
- `hooks/`: data hooks such as knowledge graph access
- `lib/`: API client and utilities
- `stores/`: Zustand stores for auth, content, and UI state
- `types/`: frontend-facing type definitions

## Extension architecture

The extension is intentionally separate from the web app.

- source files live in `apps/extension/src`
- compiled artifacts are emitted to `apps/extension/dist`
- `manifest.json` points at `dist/background.js`, `dist/content.js`, and `dist/popup.html`

Important interaction pattern:

1. the user logs in on the web app
2. the web app syncs the access token to the extension
3. the extension extracts page data in-browser
4. the extension sends content to the API

## Data architecture

The Prisma schema defines the durable model. Core records include:

- `User`
- `Content`
- `Summary`
- `Highlight`
- `Tag` and `ContentTag`
- `Review`
- `ContentInsight`
- `ContentRelation`
- `TopicCluster` and related graph join tables

Read [Domain Model](/reference/domain-model) for the model-level summary.

## Operational architecture

Runtime automation already in the repo:

- `ci.yml`: verifies Docker image builds and docs build
- `deploy.yml`: release-driven API and frontend deployment to Cloud Run plus database migration job
- `docs-pages.yml`: VitePress publish workflow for GitHub Pages

