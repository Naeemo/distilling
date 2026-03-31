import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/lib/prisma';

function toOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const configuredOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? ''
)
  .split(',')
  .map((value) => toOrigin(value.trim()))
  .filter(Boolean) as string[];

const baseURL =
  toOrigin(process.env.BETTER_AUTH_URL) ??
  toOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
  'http://localhost:3000';

const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      toOrigin(process.env.BETTER_AUTH_URL),
      toOrigin(process.env.NEXT_PUBLIC_APP_URL),
      ...configuredOrigins,
      'http://localhost:3000',
    ].filter(Boolean) as string[],
  ),
);

const fallbackSecret = 'insecure-dev-secret-replace-in-production-32';
const secret = process.env.BETTER_AUTH_SECRET ?? fallbackSecret;

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn(
    'BETTER_AUTH_SECRET is not set. Falling back to an insecure default secret.',
  );
}

export const auth = betterAuth({
  appName: 'InfoDigest',
  baseURL,
  basePath: '/api/auth',
  secret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  user: {
    modelName: 'User',
    fields: {
      image: 'avatar',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        input: false,
        defaultValue: 'USER',
      },
      subscription: {
        type: 'string',
        required: true,
        input: false,
        defaultValue: 'FREE',
      },
      deletedAt: {
        type: 'date',
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  session: {
    modelName: 'Session',
  },
  account: {
    modelName: 'Account',
  },
  verification: {
    modelName: 'Verification',
  },
  trustedOrigins,
  plugins: [nextCookies()],
});
