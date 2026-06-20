import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { json, RequestHandler, urlencoded } from 'express';

const unsafeJwtSecretValues = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'dev-access-secret',
  'dev-refresh-secret'
]);

export function assertSecurityConfiguration(configService: ConfigService) {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!isProduction) {
    return;
  }

  assertStrongSecret(configService, 'JWT_ACCESS_SECRET');
  assertStrongSecret(configService, 'JWT_REFRESH_SECRET');

  if (!parseAllowedOrigins(configService).length) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS must be set in production. Use a comma-separated allowlist.'
    );
  }
}

export function configureExpressSecurity(
  app: INestApplication,
  configService: ConfigService
) {
  const expressApp = app.getHttpAdapter().getInstance();
  const trustProxy = configService.get<string>('TRUST_PROXY');

  expressApp.disable('x-powered-by');

  if (trustProxy) {
    expressApp.set('trust proxy', trustProxy);
  }

  app.use(buildSecurityHeadersMiddleware(configService));
  app.use(json({ limit: getBodyLimit(configService) }));
  app.use(
    urlencoded({
      extended: true,
      limit: getBodyLimit(configService)
    })
  );
}

export function buildCorsOptions(
  configService: ConfigService
): CorsOptions {
  const allowedOrigins = parseAllowedOrigins(configService);
  const allowAllInNonProduction =
    configService.get<string>('NODE_ENV') !== 'production' &&
    allowedOrigins.length === 0;
  const credentials = parseBoolean(
    configService.get<string>('CORS_ALLOW_CREDENTIALS'),
    true
  );

  return {
    allowedHeaders:
      'Authorization, Content-Type, X-Requested-With, X-Request-Id',
    credentials,
    maxAge: configService.get<number>('CORS_MAX_AGE_SECONDS', 600),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    origin(origin, callback) {
      if (!origin || allowAllInNonProduction || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin is not allowed.'), false);
    }
  };
}

export function isSwaggerEnabled(configService: ConfigService) {
  const configuredValue = configService.get<string>('SWAGGER_ENABLED');

  if (configuredValue !== undefined) {
    return parseBoolean(configuredValue, false);
  }

  return configService.get<string>('NODE_ENV') !== 'production';
}

export function parseAllowedOrigins(configService: ConfigService) {
  return (configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildSecurityHeadersMiddleware(
  configService: ConfigService
): RequestHandler {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const enableHsts =
    isProduction &&
    parseBoolean(configService.get<string>('SECURITY_HSTS_ENABLED'), true);
  const hstsMaxAge = configService.get<number>(
    'SECURITY_HSTS_MAX_AGE_SECONDS',
    15552000
  );

  return (_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-DNS-Prefetch-Control', 'off');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    );

    if (enableHsts) {
      response.setHeader(
        'Strict-Transport-Security',
        `max-age=${hstsMaxAge}; includeSubDomains`
      );
    }

    next();
  };
}

function getBodyLimit(configService: ConfigService) {
  return configService.get<string>('BODY_LIMIT', '2mb');
}

function assertStrongSecret(configService: ConfigService, key: string) {
  const value = configService.get<string>(key);

  if (!value || value.length < 32 || unsafeJwtSecretValues.has(value)) {
    throw new Error(
      `${key} must be at least 32 characters and must not use a default value in production.`
    );
  }
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
