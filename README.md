# 知萃 InfoDigest

InfoDigest is a pnpm monorepo for collecting, analyzing, reading, and revisiting information across web, API, and browser-extension surfaces.

## Stack

- Backend: NestJS + Prisma + PostgreSQL + Redis
- Frontend: Next.js 16 + React 19
- Extension: Chrome Extension (Manifest V3)
- AI: Vertex AI and provider abstraction services
- Tooling: pnpm workspace + Turborepo + VitePress

## Quick Start

```bash
git clone https://github.com/Naeemo/distilling.git
cd distilling

nvm use
pnpm install
pnpm setup:local
pnpm infra:up
pnpm db:migrate
pnpm prisma:sync
pnpm dev:core
```

Local endpoints:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api/docs`

For day-to-day iteration, `pnpm dev:local` will:

1. create missing `apps/api/.env` and `apps/web/.env` from examples
2. synchronize `INTERNAL_SERVICE_TOKEN` across API/Web env files
3. ensure infra containers are up with Docker/OrbStack
4. run Prisma generate only when schema changed
5. start API + Web dev servers

## Documentation

The repository keeps two separate documentation systems:

- product-user docs in `docs/`
- contributor and coding-agent guidance in `AGENTS.md`

```bash
pnpm docs:dev
pnpm docs:build
```

Key entry points:

- `docs/index.md`
- `docs/getting-started/overview.md`
- `docs/workflows/collect-content.md`
- `docs/platforms/browser-extension.md`
- `AGENTS.md`

## License

MIT
