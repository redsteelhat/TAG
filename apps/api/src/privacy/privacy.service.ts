import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AcceptPrivacyConsentDto } from './dto/accept-privacy-consent.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

const DEFAULT_KVKK_VERSION = 'kvkk-2026-06';
const DEFAULT_PRIVACY_NOTICE_VERSION = 'privacy-notice-2026-06';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
  ) {}

  async getStatus(userId: string) {
    const user = await this.findActiveUser(userId);

    return this.toPrivacyStatus(user);
  }

  async acceptConsent(userId: string, dto: AcceptPrivacyConsentDto) {
    if (!dto.kvkkAccepted) {
      throw new BadRequestException(
        'KVKK and privacy notice acceptance is required.'
      );
    }

    const now = new Date();
    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        kvkk_accepted_at: now,
        kvkk_version: dto.kvkkVersion ?? DEFAULT_KVKK_VERSION,
        privacy_notice_accepted_at: now,
        privacy_notice_version:
          dto.privacyNoticeVersion ?? DEFAULT_PRIVACY_NOTICE_VERSION,
        explicit_consent_accepted_at: dto.explicitConsentAccepted ? now : null,
        explicit_consent_version: dto.explicitConsentAccepted
          ? dto.explicitConsentVersion
          : null
      }
    });

    return this.toPrivacyStatus(user);
  }

  async exportPersonalData(userId: string) {
    await this.findActiveUser(userId);

    const [
      user,
      driverProfile,
      vehicles,
      shifts,
      trips,
      incomeEntries,
      expenseEntries,
      fuelEntries,
      maintenanceEntries,
      recurringExpenses,
      tagPackages,
      goals,
      paymentMethods,
      attachments,
      notifications,
      exportJobs
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          email: true,
          phone: true,
          full_name: true,
          role: true,
          subscription_status: true,
          trial_ends_at: true,
          locale: true,
          timezone: true,
          kvkk_accepted_at: true,
          kvkk_version: true,
          privacy_notice_accepted_at: true,
          privacy_notice_version: true,
          explicit_consent_accepted_at: true,
          explicit_consent_version: true,
          created_at: true,
          updated_at: true,
          deleted_at: true
        }
      }),
      this.prisma.driverProfile.findUnique({
        where: {
          user_id: userId
        }
      }),
      this.prisma.vehicle.findMany({ where: { user_id: userId } }),
      this.prisma.shift.findMany({ where: { user_id: userId } }),
      this.prisma.trip.findMany({ where: { user_id: userId } }),
      this.prisma.incomeEntry.findMany({ where: { user_id: userId } }),
      this.prisma.expenseEntry.findMany({ where: { user_id: userId } }),
      this.prisma.fuelEntry.findMany({ where: { user_id: userId } }),
      this.prisma.maintenanceEntry.findMany({ where: { user_id: userId } }),
      this.prisma.recurringExpense.findMany({ where: { user_id: userId } }),
      this.prisma.tagPackage.findMany({ where: { user_id: userId } }),
      this.prisma.goal.findMany({ where: { user_id: userId } }),
      this.prisma.paymentMethod.findMany({ where: { user_id: userId } }),
      this.prisma.attachment.findMany({ where: { user_id: userId } }),
      this.prisma.notification.findMany({ where: { user_id: userId } }),
      this.prisma.exportJob.findMany({ where: { user_id: userId } })
    ]);

    return this.serialize({
      exportedAt: new Date(),
      scope: 'current-user-personal-data',
      user,
      driverProfile,
      vehicles,
      shifts,
      trips,
      incomeEntries,
      expenseEntries,
      fuelEntries,
      maintenanceEntries,
      recurringExpenses,
      tagPackages,
      goals,
      paymentMethods,
      attachments,
      notifications,
      exportJobs
    });
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const now = new Date();
    const anonymizedEmail = `deleted-${userId}@kvkk.local`;
    const anonymizedPasswordHash = await this.passwordService.hash(
      randomBytes(32).toString('hex')
    );

    await this.findActiveUser(userId);

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        user_id: userId
      },
      select: {
        id: true
      }
    });

    await this.prisma.$transaction([
      ...vehicles.map((vehicle, index) =>
        this.prisma.vehicle.update({
          where: {
            id: vehicle.id
          },
          data: {
            plate_number: `DELETED-${index + 1}-${userId.slice(0, 8)}`,
            brand: null,
            model: null,
            model_year: null,
            odometer_km: null,
            is_active: false,
            deleted_at: now
          }
        })
      ),
      this.prisma.userSession.updateMany({
        where: {
          user_id: userId,
          revoked_at: null
        },
        data: {
          revoked_at: now
        }
      }),
      this.prisma.trip.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: {
          pickup_location: null,
          dropoff_location: null,
          note: null,
          deleted_at: now
        }
      }),
      this.prisma.incomeEntry.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { note: null, deleted_at: now }
      }),
      this.prisma.expenseEntry.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { receipt_url: null, note: null, deleted_at: now }
      }),
      this.prisma.fuelEntry.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: {
          station_name: null,
          city: null,
          district: null,
          receipt_url: null,
          deleted_at: now
        }
      }),
      this.prisma.maintenanceEntry.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { service_name: null, note: null, deleted_at: now }
      }),
      this.prisma.recurringExpense.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { is_active: false, note: null, deleted_at: now }
      }),
      this.prisma.tagPackage.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { is_active: false, note: null, deleted_at: now }
      }),
      this.prisma.goal.updateMany({
        where: { user_id: userId, is_active: true },
        data: { is_active: false }
      }),
      this.prisma.paymentMethod.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: { is_active: false, deleted_at: now }
      }),
      this.prisma.attachment.updateMany({
        where: { user_id: userId, deleted_at: null },
        data: {
          original_name: null,
          deleted_at: now
        }
      }),
      this.prisma.notification.updateMany({
        where: { user_id: userId },
        data: {
          read_at: now,
          status: NotificationStatus.READ
        }
      }),
      this.prisma.user.update({
        where: {
          id: userId
        },
        data: {
          email: anonymizedEmail,
          phone: null,
          full_name: null,
          password_hash: anonymizedPasswordHash,
          erasure_requested_at: now,
          anonymized_at: now,
          deleted_at: now
        }
      })
    ]);

    return {
      success: true,
      deletedAt: now,
      reason: dto.reason ?? null
    };
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null
      }
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private toPrivacyStatus(user: {
    id: string;
    kvkk_accepted_at: Date | null;
    kvkk_version: string | null;
    privacy_notice_accepted_at: Date | null;
    privacy_notice_version: string | null;
    explicit_consent_accepted_at: Date | null;
    explicit_consent_version: string | null;
    erasure_requested_at: Date | null;
    anonymized_at: Date | null;
  }) {
    return {
      userId: user.id,
      kvkkAcceptedAt: user.kvkk_accepted_at,
      kvkkVersion: user.kvkk_version,
      privacyNoticeAcceptedAt: user.privacy_notice_accepted_at,
      privacyNoticeVersion: user.privacy_notice_version,
      explicitConsentAcceptedAt: user.explicit_consent_accepted_at,
      explicitConsentVersion: user.explicit_consent_version,
      erasureRequestedAt: user.erasure_requested_at,
      anonymizedAt: user.anonymized_at
    };
  }

  private serialize(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serialize(item));
    }

    if (value && typeof value === 'object') {
      if ('toFixed' in value && typeof value.toFixed === 'function') {
        return value.toString();
      }

      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.serialize(item)])
      );
    }

    return value;
  }
}
