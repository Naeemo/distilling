import { createHash, randomBytes } from 'node:crypto';

const TOKEN_PREFIX_LENGTH = 12;

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function createExtensionToken() {
  const token = randomBytes(32).toString('hex');

  return {
    token,
    prefix: token.slice(0, TOKEN_PREFIX_LENGTH),
    hash: sha256(token),
  };
}

export function hashExtensionToken(token: string) {
  return sha256(token);
}

export function extractExtensionTokenPrefix(token: string) {
  return token.slice(0, TOKEN_PREFIX_LENGTH);
}
