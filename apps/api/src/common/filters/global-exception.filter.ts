import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  method: string;
  timestamp: string;
  requestId?: string;
  details?: unknown;
}

interface HttpExceptionResponse {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  code?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const errorResponse = this.toErrorResponse(exception, request);

    this.logException(exception, request, errorResponse.statusCode);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private toErrorResponse(
    exception: unknown,
    request: Request
  ): ErrorResponseBody {
    const base = {
      path: request.originalUrl || request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: this.getRequestId(request)
    };

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = this.normalizeHttpExceptionResponse(exception);

      return this.withoutUndefined({
        ...base,
        statusCode,
        code: exceptionResponse.code ?? this.defaultCode(statusCode),
        message: exceptionResponse.message ?? exception.message,
        details: exceptionResponse.details
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.mapKnownPrismaError(exception);

      return this.withoutUndefined({
        ...base,
        ...prismaError
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return this.withoutUndefined({
        ...base,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection could not be initialized.'
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return this.withoutUndefined({
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'Invalid database query input.'
      });
    }

    return this.withoutUndefined({
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.'
    });
  }

  private normalizeHttpExceptionResponse(
    exception: HttpException
  ): HttpExceptionResponse {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse
      };
    }

    return exceptionResponse as HttpExceptionResponse;
  }

  private mapKnownPrismaError(
    exception: Prisma.PrismaClientKnownRequestError
  ) {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'UNIQUE_CONSTRAINT_FAILED',
          message: 'A record with the same unique value already exists.'
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
          message: 'Referenced record does not exist or cannot be changed.'
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found.'
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'Database operation failed.'
        };
    }
  }

  private defaultCode(statusCode: number) {
    return HttpStatus[statusCode] ?? 'HTTP_ERROR';
  }

  private getRequestId(request: Request) {
    const requestId = request.headers['x-request-id'];

    return Array.isArray(requestId) ? requestId[0] : requestId;
  }

  private logException(
    exception: unknown,
    request: Request,
    statusCode: number
  ) {
    const message = `${request.method} ${
      request.originalUrl || request.url
    } failed with ${statusCode}`;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(message, stack);
      return;
    }

    this.logger.warn(message);
  }

  private withoutUndefined(body: ErrorResponseBody): ErrorResponseBody {
    return Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined)
    ) as ErrorResponseBody;
  }
}
