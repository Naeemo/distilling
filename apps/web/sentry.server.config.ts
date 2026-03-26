import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
});
