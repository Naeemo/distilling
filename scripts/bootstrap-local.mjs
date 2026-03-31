#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const apiEnvPath = path.join(repoRoot, 'apps/api/.env');
const apiEnvExamplePath = path.join(repoRoot, 'apps/api/.env.example');
const webEnvPath = path.join(repoRoot, 'apps/web/.env');
const webEnvExamplePath = path.join(repoRoot, 'apps/web/.env.example');

function ensureEnvFile(envPath, envExamplePath) {
  if (existsSync(envPath)) {
    return false;
  }

  if (!existsSync(envExamplePath)) {
    throw new Error(`missing env example: ${envExamplePath}`);
  }

  copyFileSync(envExamplePath, envPath);
  return true;
}

function readEnvText(envPath) {
  return existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
}

function getEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) {
    return null;
  }

  const raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  return raw;
}

function setEnvValue(content, key, value) {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const nextLine = `${key}="${escaped}"`;
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, nextLine);
  }

  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${suffix}${nextLine}\n`;
}

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'change-this-internal-token' ||
    normalized === 'replace-with-a-32-byte-secret' ||
    normalized === 'your-secret-key-change-in-production'
  );
}

const createdApiEnv = ensureEnvFile(apiEnvPath, apiEnvExamplePath);
const createdWebEnv = ensureEnvFile(webEnvPath, webEnvExamplePath);

let apiEnv = readEnvText(apiEnvPath);
let webEnv = readEnvText(webEnvPath);

const apiToken = getEnvValue(apiEnv, 'INTERNAL_SERVICE_TOKEN');
const webToken = getEnvValue(webEnv, 'INTERNAL_SERVICE_TOKEN');

let sharedToken = null;
if (!isPlaceholder(apiToken)) {
  sharedToken = apiToken;
} else if (!isPlaceholder(webToken)) {
  sharedToken = webToken;
} else {
  sharedToken = randomBytes(24).toString('hex');
}

apiEnv = setEnvValue(apiEnv, 'INTERNAL_SERVICE_TOKEN', sharedToken);
webEnv = setEnvValue(webEnv, 'INTERNAL_SERVICE_TOKEN', sharedToken);

const webAuthSecret = getEnvValue(webEnv, 'BETTER_AUTH_SECRET');
if (isPlaceholder(webAuthSecret)) {
  const generatedAuthSecret = randomBytes(32).toString('base64url');
  webEnv = setEnvValue(webEnv, 'BETTER_AUTH_SECRET', generatedAuthSecret);
}

writeFileSync(apiEnvPath, apiEnv, 'utf8');
writeFileSync(webEnvPath, webEnv, 'utf8');

if (createdApiEnv) {
  console.log('[bootstrap] created apps/api/.env from .env.example');
}
if (createdWebEnv) {
  console.log('[bootstrap] created apps/web/.env from .env.example');
}

console.log('[bootstrap] synchronized INTERNAL_SERVICE_TOKEN across api/web env files.');
console.log('[bootstrap] ensured BETTER_AUTH_SECRET exists in apps/web/.env.');
