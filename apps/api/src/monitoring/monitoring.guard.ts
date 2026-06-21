import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { TokenService } from '../auth/token.service';

const allowedRoles = new Set(['ADMIN', 'SUPER_ADMIN']);

@Injectable()
export class MonitoringGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.hasValidMonitoringToken(request)) {
      return true;
    }

    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing monitoring credentials.');
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);

      if (!allowedRoles.has(payload.role)) {
        throw new UnauthorizedException('Admin role is required.');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid monitoring credentials.');
    }
  }

  private hasValidMonitoringToken(request: Request) {
    const expectedToken = this.configService.get<string>('MONITORING_TOKEN');

    if (!expectedToken) {
      return false;
    }

    const providedToken = request.headers['x-monitoring-token'];

    if (Array.isArray(providedToken) || !providedToken) {
      return false;
    }

    return safeEquals(providedToken, expectedToken);
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    return type === 'Bearer' && token ? token : undefined;
  }
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
