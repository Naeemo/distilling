import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiToken = this.extractApiToken(request);

    if (!apiToken) {
      throw new UnauthorizedException('API token is required');
    }

    // 查找用户
    const user = await this.prisma.user.findFirst({
      where: { apiToken },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid API token');
    }

    // 将用户信息附加到请求
    request.user = { userId: user.id, email: user.email };
    return true;
  }

  private extractApiToken(request: any): string | null {
    // 支持 Header: X-API-Token 或 Query: ?token=xxx
    const headerToken = request.headers['x-api-token'];
    if (headerToken) return headerToken;

    const queryToken = request.query.token;
    if (queryToken) return queryToken;

    // 支持 Authorization: Bearer token
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
