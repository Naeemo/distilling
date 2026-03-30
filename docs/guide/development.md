# Development

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose
- a local PostgreSQL and Redis runtime via `docker-compose.yml`

## Bootstrap

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker-compose up -d
pnpm db:migrate
pnpm dev
```

Default local endpoints:

- web: `http://localhost:3000`
- api: `http://localhost:3001`
- swagger: `http://localhost:3001/api/docs`

## Environment variables

The committed example file is `apps/api/.env.example`.

Important API variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_ACCESS_EXPIRATION` | access token lifetime |
| `GCP_PROJECT_ID` | Vertex AI project |
| `VERTEX_AI_LOCATION` | Vertex AI region |
| `VERTEX_AI_MODEL` | default Vertex AI model |
| `FRONTEND_URL` | CORS origin |
| `PORT` | API port |

The web app does not currently require a committed `.env.example` for local development. During local dev it proxies `/api/*` to the backend using `apps/web/next.config.ts`.

## Common commands

### Workspace level

```bash
pnpm dev
pnpm build
pnpm type-check
pnpm lint
pnpm docs:dev
pnpm docs:build
```

### Database

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

### Extension

```bash
pnpm --filter @infodigest/extension build
pnpm --filter @infodigest/extension type-check
```

## Validation expectations

Before proposing a change, prefer the smallest relevant verification set:

- API-only changes: `pnpm --filter @infodigest/api type-check`
- web-only changes: `pnpm --filter @infodigest/web type-check`
- extension-only changes: `pnpm --filter @infodigest/extension build`
- docs-only changes: `pnpm docs:build`
- broad changes: `pnpm type-check` and `pnpm lint`

## Notes on current scripts

- API type-check runs `prisma generate` first because Prisma client output is required for accurate types.
- Workspace `lint` currently delegates to package-level static verification and is intentionally conservative.
- Extension build output belongs in `apps/extension/dist`, not in `src`.

