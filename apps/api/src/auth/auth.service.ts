import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { RefreshTokenPayload, TokenService } from './token.service';

const DEFAULT_KVKK_VERSION = 'kvkk-2026-06';
const DEFAULT_PRIVACY_NOTICE_VERSION = 'privacy-notice-2026-06';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.kvkkAccepted) {
      throw new BadRequestException(
        'KVKK and privacy notice acceptance is required.'
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const consentAcceptedAt = new Date();

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          password_hash: passwordHash,
          full_name: dto.fullName,
          kvkk_accepted_at: consentAcceptedAt,
          kvkk_version: dto.kvkkVersion ?? DEFAULT_KVKK_VERSION,
          privacy_notice_accepted_at: consentAcceptedAt,
          privacy_notice_version:
            dto.privacyNoticeVersion ?? DEFAULT_PRIVACY_NOTICE_VERSION,
          explicit_consent_accepted_at: dto.explicitConsentAccepted
            ? new Date()
            : undefined,
          explicit_consent_version: dto.explicitConsentAccepted
            ? dto.explicitConsentVersion
            : undefined
        }
      });

      const tokens = await this.createSessionTokens(user, dto.deviceName);

      return {
        user: this.toAuthUser(user),
        ...tokens
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email or phone is already registered.');
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deleted_at: null
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verify(
      dto.password,
      user.password_hash
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.createSessionTokens(user, dto.deviceName);

    return {
      user: this.toAuthUser(user),
      ...tokens
    };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const session = await this.prisma.userSession.findUnique({
      where: {
        id: payload.sessionId
      },
      include: {
        user: true
      }
    });

    if (
      !session ||
      session.revoked_at ||
      session.expires_at.getTime() <= Date.now() ||
      session.user.deleted_at
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokenMatches = await this.passwordService.verify(
      refreshToken,
      session.refresh_token_hash
    );

    if (!tokenMatches) {
      await this.prisma.userSession.update({
        where: {
          id: session.id
        },
        data: {
          revoked_at: new Date()
        }
      });

      throw new UnauthorizedException('Invalid refresh token.');
    }

    const accessToken = await this.tokenService.signAccessToken(session.user);
    const newRefreshToken = await this.tokenService.signRefreshToken(
      session.user,
      session.id
    );
    const refreshTokenHash = await this.passwordService.hash(newRefreshToken);
    const refreshExpiresAt = this.getRefreshExpiresAt();

    await this.prisma.userSession.update({
      where: {
        id: session.id
      },
      data: {
        refresh_token_hash: refreshTokenHash,
        expires_at: refreshExpiresAt,
        last_used_at: new Date()
      }
    });

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  private async createSessionTokens(user: User, deviceName?: string) {
    const sessionId = randomUUID();
    const accessToken = await this.tokenService.signAccessToken(user);
    const refreshToken = await this.tokenService.signRefreshToken(
      user,
      sessionId
    );
    const refreshTokenHash = await this.passwordService.hash(refreshToken);
    const refreshExpiresAt = this.getRefreshExpiresAt();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        device_name: deviceName,
        expires_at: refreshExpiresAt,
        last_used_at: new Date()
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  private getRefreshExpiresAt() {
    const ttl = this.configService.get<string>('JWT_REFRESH_TTL', '30d');
    const milliseconds = this.tokenService.parseDurationToMs(ttl);

    return new Date(Date.now() + milliseconds);
  }

  private toAuthUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      timezone: user.timezone
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
