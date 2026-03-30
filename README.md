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

The canonical project docs now live in `docs/` and are built with VitePress.

```bash
pnpm docs:dev
pnpm docs:build
```

Key docs entry points:

- `docs/index.md`
- `docs/guide/architecture.md`
- `docs/guide/development.md`
- `docs/operations/deployment.md`
- `docs/guide/agent-guide.md`

## License

MIT
