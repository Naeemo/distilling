#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const composeFile = path.join(repoRoot, 'docker-compose.yml');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/infra.mjs <compose-args...>');
  console.error('Example: node scripts/infra.mjs up -d');
  process.exit(1);
}

function commandWorks(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  return result.status === 0;
}

let binary = 'docker';
let prefixArgs = ['compose'];

if (!commandWorks('docker', ['compose', 'version'])) {
  if (commandWorks('docker-compose', ['version'])) {
    binary = 'docker-compose';
    prefixArgs = [];
  } else {
    console.error('[infra] neither "docker compose" nor "docker-compose" is available.');
    process.exit(1);
  }
}

const fullArgs = [...prefixArgs, '-f', composeFile, ...args];
const result = spawnSync(binary, fullArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[infra] failed to execute ${binary}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
