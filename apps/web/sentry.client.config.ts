import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 1.0,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
