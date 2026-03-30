'use client';

import { createAuthClient } from 'better-auth/react';

const baseURL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`
  : '/api/auth';

export const authClient = createAuthClient({
  baseURL,
});
