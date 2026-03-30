# Deployment

## Deployment targets

The repository currently supports:

- local development via Docker Compose
- Cloud Run deployment for the API
- Cloud Run deployment for the web app
- GitHub Pages deployment for docs

## Local runtime

`docker-compose.yml` starts:

- PostgreSQL 15 on `5432`
- Redis 7 on `6379`

This is the expected default local dependency stack for development.

## API and frontend images

Manual image build definitions exist in:

- `cloudbuild.api.yaml`
- `cloudbuild.web.yaml`

Those files build Docker images from:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`

## Release deployment workflow

The main production deployment automation is `.github/workflows/deploy.yml`.

It performs three high-level phases:

1. build and deploy the API to Cloud Run
2. create or update a Cloud Run job and execute Prisma migrations
3. build and deploy the frontend to Cloud Run, then update API CORS origin

## Runtime assumptions

The deploy workflow expects these Google Cloud resources to exist:

- GCP project `infodigest-prod`
- Cloud Run services for API and web
- Cloud SQL instance `infodigest-db`
- Artifact Registry repository `cloud-run`
- Workload identity provider and deploy service account

## Secret requirements

The current deploy workflow reads these secrets from Google Secret Manager:

- `database-url`
- `redis-url`
- `jwt-secret`

## Docs deployment

Docs are deployed separately through `.github/workflows/docs-pages.yml`.

That workflow:

- builds the VitePress site from `docs/`
- uploads `docs/.vitepress/dist`
- deploys it using the GitHub Pages artifact workflow

## Operator checklist

Before changing deployment behavior:

1. update the workflow file
2. update this page
3. update `operations/release.md` if the release procedure changed

