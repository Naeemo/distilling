# E2E Test Plan

This repository now has a Playwright-based web end-to-end suite for the MVP flows.

## Priority split

- `P0`
  - register, logout, and login
  - manual text collection from the dashboard
  - reader navigation and reading-status persistence
- `P1`
  - dashboard search and status filters
  - review-page empty state for a fresh account
  - knowledge-graph entry and explore shell rendering

## Commands

```bash
pnpm test:e2e
pnpm test:e2e:p0
pnpm test:e2e:p1
pnpm test:e2e:ui
```

## Runtime assumptions

- Set `E2E_BASE_URL` when you want to point the suite at a deployed environment.
- If `E2E_BASE_URL` is not set, the suite assumes `http://127.0.0.1:3000`.
- Tests create their own users with unique emails, so they do not depend on shared seed data.

## Current scope notes

- The suite intentionally focuses on deterministic MVP flows that can run against a real environment without direct database seeding.
- Review-rating flows and AI-summary generation are not included yet because they currently need more controllable test data and infrastructure.
