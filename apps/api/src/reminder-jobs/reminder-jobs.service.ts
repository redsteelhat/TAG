import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationStatus,
  NotificationType,
  Prisma,
  RecurringExpense
} from '@prisma/client';
import { maskLogMessage } from '../common/logging/log-masker';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface ReminderRunResult {
  dispatchedDueNotifications: number;
  maintenanceReminders: number;
  packageEndingReminders: number;
  recurringDueReminders: number;
}

@Injectable()
export class ReminderJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderJobsService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    const isEnabled = this.configService.get<string>(
      'REMINDER_JOBS_ENABLED',
      'true'
    );

    if (isEnabled === 'false') {
      return;
    }

    const intervalMs = this.getNumberConfig(
      'REMINDER_JOBS_INTERVAL_MS',
      6 * 60 * 60 * 1000
    );

    this.interval = setInterval(() => {
      void this.runÖnce().catch((error) => {
        this.logger.error(
          maskLogMessage(
            error instanceof Error ? error.message : 'Reminder job failed.'
          )
        );
      });
    }, intervalMs);

    this.interval.unref?.();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async runÖnce(now = new Date()): Promise<ReminderRunResult> {
    const dueNotifications =
      await this.notificationsService.dispatchDueNotifications(now);
    const [
      packageEndingReminders,
      recurringDueReminders,
      maintenanceReminders
    ] = await Promise.all([
      this.createPackageEndingReminders(now),
      this.createRecurringDueReminders(now),
      this.createMaintenanceReminders()
    ]);

    return {
      dispatchedDueNotifications: dueNotifications.dispatchedCount,
      maintenanceReminders,
      packageEndingReminders,
      recurringDueReminders
    };
  }

  private async createPackageEndingReminders(now: Date) {
    const windowDays = this.getNumberConfig('PACKAGE_ENDING_REMINDER_DAYS', 3);
    const windowEnd = this.addDays(now, windowDays);
    const tagPackages = await this.prisma.tagPackage.findMany({
      where: {
        deleted_at: null,
        ends_at: {
          gte: now,
          lte: windowEnd
        },
        is_active: true
      }
    });
    let createdCount = 0;

    for (const tagPackage of tagPackages) {
      const wasCreated = await this.createReminderIfMissing({
        body: `${tagPackage.name} paketin ${this.formatDate(tagPackage.ends_at)} tarihinde bitiyor.`,
        entityId: tagPackage.id,
        entityType: 'tag_package',
        reminderKey: `package-ending:${tagPackage.id}:${this.formatDate(tagPackage.ends_at)}`,
        title: 'Paket bitisi yaklaşıyor',
        type: NotificationType.PACKAGE_ENDING,
        userId: tagPackage.user_id
      });

      if (wasCreated) {
        createdCount += 1;
      }
    }

    return createdCount;
  }

  private async createRecurringDueReminders(now: Date) {
    const windowDays = this.getNumberConfig('RECURRING_DUE_REMINDER_DAYS', 7);
    const windowEnd = this.addDays(now, windowDays);
    const recurringExpenses = await this.prisma.recurringExpense.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        next_due_at: {
          gte: now,
          lte: windowEnd
        }
      }
    });
    let createdCount = 0;

    for (const recurringExpense of recurringExpenses) {
      if (!recurringExpense.next_due_at) {
        continue;
      }

      const type = this.resolveRecurringReminderType(recurringExpense);
      const wasCreated = await this.createReminderIfMissing({
        body: `${recurringExpense.name} ödemesi ${this.formatDate(recurringExpense.next_due_at)} tarihinde vadesine geliyor.`,
        entityId: recurringExpense.id,
        entityType: 'recurring_expense',
        reminderKey: `recurring-due:${recurringExpense.id}:${this.formatDate(recurringExpense.next_due_at)}`,
        title: this.titleForRecurringReminderType(type),
        type,
        userId: recurringExpense.user_id
      });

      if (wasCreated) {
        createdCount += 1;
      }
    }

    return createdCount;
  }

  private async createMaintenanceReminders() {
    const thresholdKm = new Prisma.Decimal(
      this.configService.get<string>('MAINTENANCE_REMINDER_THRESHOLD_KM', '500')
    );
    const maintenanceEntries = await this.prisma.maintenanceEntry.findMany({
      include: {
        vehicle: true
      },
      where: {
        deleted_at: null,
        expected_interval_km: {
          not: null
        },
        odometer_km: {
          not: null
        },
        vehicle: {
          deleted_at: null,
          is_active: true,
          odometer_km: {
            not: null
          }
        }
      }
    });
    let createdCount = 0;

    for (const entry of maintenanceEntries) {
      if (
        !entry.expected_interval_km ||
        !entry.odometer_km ||
        !entry.vehicle.odometer_km
      ) {
        continue;
      }

      const dueAtKm = entry.odometer_km.plus(entry.expected_interval_km);
      const remainingKm = dueAtKm.minus(entry.vehicle.odometer_km);

      if (remainingKm.gt(thresholdKm)) {
        continue;
      }

      const wasCreated = await this.createReminderIfMissing({
        body: remainingKm.gte(0)
          ? `${entry.title} bakımina ${remainingKm.toDecimalPlaces(0).toFixed(0)} km kaldi.`
          : `${entry.title} bakımi ${remainingKm.abs().toDecimalPlaces(0).toFixed(0)} km geçıktı.`,
        entityId: entry.id,
        entityType: 'maintenance_entry',
        reminderKey: `maintenance-km:${entry.id}:${dueAtKm.toDecimalPlaces(1).toFixed(1)}`,
        title: 'Bakım zamani yaklaşıyor',
        type: NotificationType.MAINTENANCE_REMINDER,
        userId: entry.user_id
      });

      if (wasCreated) {
        createdCount += 1;
      }
    }

    return createdCount;
  }

  private async createReminderIfMissing(input: {
    body: string;
    entityId: string;
    entityType: string;
    reminderKey: string;
    title: string;
    type: NotificationType;
    userId: string;
  }) {
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        metadata: {
          path: ['reminderKey'],
          equals: input.reminderKey
        },
        status: {
          not: NotificationStatus.FAILED
        },
        type: input.type,
        user_id: input.userId
      }
    });

    if (existingNotification) {
      return false;
    }

    await this.notificationsService.createImmediate({
      body: input.body,
      metadata: {
        entityId: input.entityId,
        entityType: input.entityType,
        reminderKey: input.reminderKey
      },
      title: input.title,
      type: input.type,
      userId: input.userId
    });

    return true;
  }

  private resolveRecurringReminderType(recurringExpense: RecurringExpense) {
    const name = recurringExpense.name.toLocaleLowerCase('tr-TR');

    if (name.includes('sigorta') || name.includes('kasko')) {
      return NotificationType.INSURANCE_REMINDER;
    }

    if (
      name.includes('mtv') ||
      name.includes('vergi') ||
      name.includes('muayene')
    ) {
      return NotificationType.TAX_REMINDER;
    }

    return NotificationType.SYSTEM_ANNOUNCEMENT;
  }

  private titleForRecurringReminderType(type: NotificationType) {
    if (type === NotificationType.INSURANCE_REMINDER) {
      return 'Sigörta ödemesi yaklaşıyor';
    }

    if (type === NotificationType.TAX_REMINDER) {
      return 'Vergi veya muayene ödemesi yaklaşıyor';
    }

    return 'Tekrarlayan gider vadesi yaklaşıyor';
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);

    result.setUTCDate(result.getUTCDate() + days);

    return result;
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getNumberConfig(key: string, fallback: number) {
    const value = this.configService.get<string | number>(key, fallback);
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
