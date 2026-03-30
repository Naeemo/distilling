import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/lib/prisma';

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000';
const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  throw new Error('BETTER_AUTH_SECRET is required');
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
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
  ].filter(Boolean) as string[],
  plugins: [nextCookies()],
});
