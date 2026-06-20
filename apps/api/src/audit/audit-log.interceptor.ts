import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import {
  maskLogMessage,
  maskSensitiveData
} from '../common/logging/log-masker';
import {
  AUDIT_LOG_METADATA_KEY,
  AuditLogMetadata
} from './audit-log.decorator';
import { AuditService } from './audit.service';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

interface ApiResponseBody {
  data?: unknown;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const metadata = this.getAuditMetadata(context, request);

    if (!metadata) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body) => {
        const actorId = request.user?.id;
        const userId =
          actorId ?? this.getStringByPath(body, metadata.userIdPath);
        const entityId =
          this.getStringParam(request, metadata.entityIdParam) ??
          this.getStringByPath(body, metadata.entityIdPath) ??
          this.getDefaultEntityId(body);

        void this.auditService
          .log({
            userId,
            actorId,
            action: metadata.action,
            entityType: metadata.entityType,
            entityId,
            ipAddress: this.getIpAddress(request),
            userAgent: request.headers['user-agent'],
            metadata: maskSensitiveData({
              method: request.method,
              path: request.originalUrl || request.url,
              statusCode: response.statusCode
            }) as Record<string, string | number>
          })
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : 'Unknown audit error';
            this.logger.warn(
              maskLogMessage(`Audit log write failed: ${message}`)
            );
          });
      })
    );
  }

  private getAuditMetadata(
    context: ExecutionContext,
    request: Request
  ): AuditLogMetadata | undefined {
    const explicitMetadata = this.reflector.getAllAndOverride<
      AuditLogMetadata | undefined
    >(AUDIT_LOG_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (explicitMetadata) {
      return explicitMetadata;
    }

    if (!this.shouldAuditByDefault(request.method)) {
      return undefined;
    }

    return {
      action: `http.${request.method.toLowerCase()}`,
      entityType: this.getEntityTypeFromRoute(request)
    };
  }

  private shouldAuditByDefault(method: string) {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private getEntityTypeFromRoute(request: Request) {
    const path = (request.originalUrl || request.url).split('?')[0];
    const segments = path.split('/').filter(Boolean);
    const entitySegment = segments.filter(
      (segment) => segment !== 'api' && !/^v\d+$/i.test(segment)
    )[0];

    return entitySegment?.replace(':', '');
  }

  private getIpAddress(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0];
    }

    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request.ip;
  }

  private getStringParam(request: Request, paramName?: string) {
    if (!paramName) {
      return undefined;
    }

    const value = request.params[paramName];

    return typeof value === 'string' ? value : undefined;
  }

  private getStringByPath(source: unknown, path?: string) {
    if (!path) {
      return undefined;
    }

    const value = path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }

      return undefined;
    }, source);

    return typeof value === 'string' ? value : undefined;
  }

  private getDefaultEntityId(body: unknown) {
    const data = (body as ApiResponseBody | undefined)?.data;

    if (data && typeof data === 'object' && 'id' in data) {
      const id = (data as Record<string, unknown>).id;
      return typeof id === 'string' ? id : undefined;
    }

    return undefined;
  }
}
