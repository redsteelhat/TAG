import { ConfigService } from '@nestjs/config';
import {
  assertSecurityConfiguration,
  buildCorsOptions,
  isSwaggerEnabled,
  parseAllowedOrigins
} from './security';

function config(values: Record<string, string | undefined>) {
  return new ConfigService(values);
}

describe('security bootstrap helpers', () => {
  it('requires strong JWT secrets and CORS allowlist in production', () => {
    expect(() =>
      assertSecurityConfiguration(
        config({
          CORS_ALLOWED_ORIGINS: 'https://app.example.com',
          JWT_ACCESS_SECRET: 'change-me-access-secret',
          JWT_REFRESH_SECRET: 'change-me-refresh-secret',
          NODE_ENV: 'production'
        })
      )
    ).toThrow('JWT_ACCESS_SECRET');

    expect(() =>
      assertSecurityConfiguration(
        config({
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
          NODE_ENV: 'production'
        })
      )
    ).toThrow('CORS_ALLOWED_ORIGINS');
  });

  it('accepts production config with strong secrets and allowlisted origins', () => {
    expect(() =>
      assertSecurityConfiguration(
        config({
          CORS_ALLOWED_ORIGINS: 'https://app.example.com',
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
          NODE_ENV: 'production'
        })
      )
    ).not.toThrow();
  });

  it('parses CORS origins and rejects non-allowlisted origins', () => {
    const configService = config({
      CORS_ALLOWED_ORIGINS:
        'https://app.example.com, https://admin.example.com',
      NODE_ENV: 'production'
    });
    const corsOptions = buildCorsOptions(configService);

    expect(parseAllowedOrigins(configService)).toEqual([
      'https://app.example.com',
      'https://admin.example.com'
    ]);

    expect(corsOptions.origin).toBeInstanceOf(Function);

    const originCallback = corsOptions.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => void;

    originCallback('https://app.example.com', (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
    });

    originCallback('https://evil.example.com', (error, allow) => {
      expect(error).toBeInstanceOf(Error);
      expect(allow).toBe(false);
    });
  });

  it('disables Swagger by default in production', () => {
    expect(isSwaggerEnabled(config({ NODE_ENV: 'production' }))).toBe(false);
    expect(
      isSwaggerEnabled(
        config({
          NODE_ENV: 'production',
          SWAGGER_ENABLED: 'true'
        })
      )
    ).toBe(true);
  });
});
