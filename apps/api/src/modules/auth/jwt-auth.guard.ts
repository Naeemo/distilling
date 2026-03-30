import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalToken = this.getHeaderValue(
      request.headers['x-internal-service-token'],
    );
    const expectedToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!expectedToken) {
      throw new UnauthorizedException('INTERNAL_SERVICE_TOKEN is not configured');
    }

    if (!internalToken || internalToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    const userId = this.getHeaderValue(request.headers['x-user-id']);
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    request.user = {
      userId,
      email: this.getHeaderValue(request.headers['x-user-email']) ?? null,
      role: this.getHeaderValue(request.headers['x-user-role']) ?? 'USER',
      subscription:
        this.getHeaderValue(request.headers['x-user-subscription']) ?? 'FREE',
    };

    return true;
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
