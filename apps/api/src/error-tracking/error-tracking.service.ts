import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  maskLogMessage,
  maskSensitiveData
} from '../common/logging/log-masker';

export type ErrorSeverity = 'warning' | 'error' | 'fatal';

export interface ErrorTrackingContext {
  extra?: Record<string, unknown>;
  request?: {
    method?: string;
    path?: string;
    requestId?: string;
  };
  severity?: ErrorSeverity;
  source: string;
  tags?: Record<string, string | number | boolean | undefined>;
}

interface ErrorTrackingEvent {
  eventId: string;
  environment: string;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
  extra?: unknown;
  release?: string;
  request?: unknown;
  severity: ErrorSeverity;
  source: string;
  tags?: unknown;
  timestamp: string;
}

@Injectable()
export class ErrorTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private readonly unhandledRejectionHandler = (reason: unknown) => {
    void this.captureException(reason, {
      severity: 'error',
      source: 'process.unhandledRejection'
    });
  };
  private readonly uncaughtExceptionHandler = (error: Error) => {
    void this.captureException(error, {
      severity: 'fatal',
      source: 'process.uncaughtException'
    }).finally(() => {
      process.exitCode = 1;
      const exitTimer = setTimeout(() => process.exit(1), 100);
      exitTimer.unref?.();
    });
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!this.isEnabled()) {
      return;
    }

    process.on('unhandledRejection', this.unhandledRejectionHandler);
    process.on('uncaughtException', this.uncaughtExceptionHandler);
  }

  onModuleDestroy() {
    process.off('unhandledRejection', this.unhandledRejectionHandler);
    process.off('uncaughtException', this.uncaughtExceptionHandler);
  }

  async captureException(exception: unknown, context: ErrorTrackingContext) {
    const event = this.buildEvent(exception, context);

    if (!this.isEnabled() || !this.shouldSample(context.severity ?? 'error')) {
      return {
        captured: false,
        eventId: event.eventId
      };
    }

    const webhookUrl = this.configService.get<string>(
      'ERROR_TRACKING_WEBHOOK_URL'
    );

    if (!webhookUrl) {
      this.logger.debug(`Error tracking event prepared: ${event.eventId}`);
      return {
        captured: false,
        eventId: event.eventId
      };
    }

    await this.sendEvent(webhookUrl, event);

    return {
      captured: true,
      eventId: event.eventId
    };
  }

  private buildEvent(
    exception: unknown,
    context: ErrorTrackingContext
  ): ErrorTrackingEvent {
    const error = exception instanceof Error ? exception : undefined;
    const message = error
      ? error.message
      : typeof exception === 'string'
        ? exception
        : 'Unknown error';

    return {
      eventId: randomUUID(),
      environment: this.configService.get<string>(
        'ERROR_TRACKING_ENVIRONMENT',
        this.configService.get<string>('NODE_ENV', 'development')
      ),
      error: {
        message: maskLogMessage(message),
        name: error?.name ?? 'UnknownError',
        stack: error?.stack ? maskLogMessage(error.stack) : undefined
      },
      extra: context.extra ? maskSensitiveData(context.extra) : undefined,
      release: this.configService.get<string>('ERROR_TRACKING_RELEASE'),
      request: context.request ? maskSensitiveData(context.request) : undefined,
      severity: context.severity ?? 'error',
      source: context.source,
      tags: context.tags ? maskSensitiveData(context.tags) : undefined,
      timestamp: new Date().toISOString()
    };
  }

  private async sendEvent(webhookUrl: string, event: ErrorTrackingEvent) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getPositiveNumber('ERROR_TRACKING_TIMEOUT_MS', 3000)
    );

    try {
      const response = await fetch(webhookUrl, {
        body: JSON.stringify(event),
        headers: this.buildHeaders(),
        method: 'POST',
        signal: controller.signal
      });

      if (!response.ok) {
        this.logger.warn(
          `Error tracking webhook returned ${response.status} for ${event.eventId}`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error tracking send failed.';
      this.logger.warn(maskLogMessage(message));
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders() {
    const token = this.configService.get<string>('ERROR_TRACKING_AUTH_TOKEN');
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private isEnabled() {
    return parseBoolean(
      this.configService.get<string>('ERROR_TRACKING_ENABLED'),
      false
    );
  }

  private shouldSample(severity: ErrorSeverity) {
    if (severity === 'fatal') {
      return true;
    }

    return Math.random() <= this.getSampleRate();
  }

  private getPositiveNumber(key: string, fallback: number) {
    const parsed = Number(this.configService.get<string | number>(key));

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getSampleRate() {
    const parsed = Number(
      this.configService.get<string | number>('ERROR_TRACKING_SAMPLE_RATE', 1)
    );

    if (!Number.isFinite(parsed)) {
      return 1;
    }

    return Math.max(0, Math.min(parsed, 1));
  }
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
