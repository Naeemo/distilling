import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get('SENTRY_DSN');
    const environment = this.configService.get('NODE_ENV', 'development');
    
    if (!dsn) {
      console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
      return;
    }

    Sentry.init({
      dsn,
      environment,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // 过滤敏感信息
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers['x-api-token'];
        }
        return event;
      },
    });

    console.log('Sentry initialized successfully');
  }
}
