#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const schemaPath = path.join(repoRoot, 'apps/api/prisma/schema.prisma');
const cacheDir = path.join(repoRoot, 'node_modules/.cache/infodigest');
const cacheFile = path.join(cacheDir, 'prisma-schema.sha256');
const force = process.argv.includes('--force');

if (!existsSync(schemaPath)) {
  console.error(`[prisma-sync] schema not found: ${schemaPath}`);
  process.exit(1);
}

const schemaHash = createHash('sha256')
  .update(readFileSync(schemaPath, 'utf8'))
  .digest('hex');

const cachedHash = existsSync(cacheFile) ? readFileSync(cacheFile, 'utf8').trim() : null;
const clientMarkers = [
  path.join(repoRoot, 'node_modules/.prisma/client/index.d.ts'),
  path.join(repoRoot, 'node_modules/@prisma/client/index.d.ts'),
  path.join(repoRoot, 'apps/api/node_modules/.prisma/client/index.d.ts'),
  path.join(repoRoot, 'apps/api/node_modules/@prisma/client/index.d.ts'),
  path.join(repoRoot, 'apps/web/node_modules/.prisma/client/index.d.ts'),
  path.join(repoRoot, 'apps/web/node_modules/@prisma/client/index.d.ts'),
];

const hasGeneratedClient = clientMarkers.some((marker) => existsSync(marker));

if (!force && cachedHash === schemaHash && hasGeneratedClient) {
  console.log('[prisma-sync] schema unchanged, skip prisma generate.');
  process.exit(0);
}

console.log('[prisma-sync] schema changed or client missing, running prisma generate...');
const result = spawnSync(
  'pnpm',
  ['--filter', '@infodigest/api', 'exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`[prisma-sync] failed to run pnpm: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

mkdirSync(cacheDir, { recursive: true });
writeFileSync(cacheFile, `${schemaHash}\n`, 'utf8');
console.log('[prisma-sync] prisma client is up-to-date.');
