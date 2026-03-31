#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const full = process.argv.includes('--full');

function run(command, args) {
  console.log(`[verify] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[verify] failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (full) {
  run('pnpm', ['type-check']);
  run('pnpm', ['lint']);
  process.exit(0);
}

const gitStatus = spawnSync('git', ['status', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (gitStatus.error || gitStatus.status !== 0) {
  console.error('[verify] failed to read git status.');
  process.exit(1);
}

const changedFiles = gitStatus.stdout
  .split('\n')
  .map((line) => line.trimEnd())
  .filter(Boolean)
  .map((line) => {
    const rawPath = line.slice(3).trim();
    if (rawPath.includes(' -> ')) {
      return rawPath.split(' -> ').pop() ?? rawPath;
    }
    return rawPath;
  });

if (changedFiles.length === 0) {
  console.log('[verify] no local changes found, nothing to run.');
  process.exit(0);
}

const scopeToCommand = new Map([
  ['api', ['pnpm', ['--filter', '@infodigest/api', 'type-check']]],
  ['web', ['pnpm', ['--filter', '@infodigest/web', 'type-check']]],
  ['extension', ['pnpm', ['--filter', '@infodigest/extension', 'build']]],
  ['docs', ['pnpm', ['docs:build']]],
]);

const scopes = new Set();
for (const file of changedFiles) {
  if (file.startsWith('apps/api/')) {
    scopes.add('api');
  } else if (file.startsWith('apps/web/')) {
    scopes.add('web');
  } else if (file.startsWith('apps/extension/')) {
    scopes.add('extension');
  } else if (file.startsWith('docs/')) {
    scopes.add('docs');
  } else {
    scopes.add('root');
  }
}

if (scopes.has('root')) {
  console.log('[verify] root/shared files changed, running broad verification.');
  run('pnpm', ['type-check']);
  run('pnpm', ['lint']);
  process.exit(0);
}

for (const scope of scopes) {
  const command = scopeToCommand.get(scope);
  if (!command) {
    continue;
  }

  const [binary, args] = command;
  run(binary, args);
}

console.log('[verify] completed changed-scope verification.');
