import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
  it('parses supported duration strings', () => {
    const service = new TokenService(new JwtService(), new ConfigService());

    expect(service.parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(service.parseDurationToMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

