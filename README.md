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

pnpm install
cp apps/api/.env.example apps/api/.env
docker-compose up -d
pnpm db:migrate
pnpm dev
```

Local endpoints:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api/docs`

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
