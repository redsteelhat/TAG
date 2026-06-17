import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  signAccessToken(user: User) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      type: 'access'
    };

    return this.jwtService.signAsync(payload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getAccessTtl()
    });
  }

  signRefreshToken(user: User, sessionId: string) {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      type: 'refresh'
    };

    return this.jwtService.signAsync(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshTtl()
    });
  }

  async verifyRefreshToken(token: string) {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      token,
      {
        secret: this.getRefreshSecret()
      }
    );

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type.');
    }

    return payload;
  }

  async verifyAccessToken(token: string) {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
      token,
      {
        secret: this.getAccessSecret()
      }
    );

    if (payload.type !== 'access') {
      throw new Error('Invalid token type.');
    }

    return payload;
  }

  parseDurationToMs(duration: string) {
    const match = /^(\d+)([smhd])$/.exec(duration);

    if (!match) {
      throw new Error(`Unsupported duration format: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }
  }

  private getAccessSecret() {
    return this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret'
    );
  }

  private getRefreshSecret() {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret'
    );
  }

  private getAccessTtl(): JwtExpiresIn {
    return this.configService.get<JwtExpiresIn>('JWT_ACCESS_TTL', '15m');
  }

  private getRefreshTtl(): JwtExpiresIn {
    return this.configService.get<JwtExpiresIn>('JWT_REFRESH_TTL', '30d');
  }
}
