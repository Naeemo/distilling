'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

function resolveBaseURL() {
  const appURL =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  try {
    return new URL('/api/auth', appURL).toString();
  } catch {
    return 'http://localhost:3000/api/auth';
  }
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
  plugins: [magicLinkClient()],
});
