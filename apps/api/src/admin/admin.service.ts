import { Injectable } from '@nestjs/common';
import {
  ExportStatus,
  NotificationStatus,
  SubscriptionStatus,
  UserRole
} from '@prisma/client';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly healthService: HealthService,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  async getOverview() {
    const since24h = this.daysAgo(1);
    const since7d = this.daysAgo(7);

    const [
      health,
      totalUsers,
      activeUsers,
      newUsers24h,
      newUsers7d,
      adminUsers,
      usersBySubscription,
      vehicles,
      trips,
      expenses,
      fuelEntries,
      maintenanceEntries,
      exportsByStatus,
      failedExports24h,
      pendingNotifications,
      failedNotifications24h,
      feedbackOpen,
      recentFeedback,
      auditLogs24h,
      recentUsers
    ] = await Promise.all([
      this.healthService.getReadiness(),
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.count({
        where: { deleted_at: null, anonymized_at: null }
      }),
      this.prisma.user.count({
        where: { created_at: { gte: since24h }, deleted_at: null }
      }),
      this.prisma.user.count({
        where: { created_at: { gte: since7d }, deleted_at: null }
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }
        }
      }),
      this.prisma.user.groupBy({
        by: ['subscription_status'],
        where: { deleted_at: null },
        _count: { _all: true }
      }),
      this.prisma.vehicle.count({ where: { deleted_at: null } }),
      this.prisma.trip.count({ where: { deleted_at: null } }),
      this.prisma.expenseEntry.count({ where: { deleted_at: null } }),
      this.prisma.fuelEntry.count({ where: { deleted_at: null } }),
      this.prisma.maintenanceEntry.count({ where: { deleted_at: null } }),
      this.prisma.exportJob.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      this.prisma.exportJob.count({
        where: {
          status: ExportStatus.FAILED,
          updated_at: { gte: since24h }
        }
      }),
      this.prisma.notification.count({
        where: {
          status: NotificationStatus.PENDING
        }
      }),
      this.prisma.notification.count({
        where: {
          created_at: { gte: since24h },
          status: NotificationStatus.FAILED
        }
      }),
      this.prisma.feedback.count({
        where: {
          status: 'OPEN'
        }
      }),
      this.prisma.feedback.findMany({
        include: {
          user: {
            select: {
              id: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 5
      }),
      this.prisma.auditLog.count({
        where: {
          created_at: { gte: since24h }
        }
      }),
      this.prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          created_at: true,
          id: true,
          role: true,
          subscription_status: true
        },
        take: 8,
        where: {
          deleted_at: null
        }
      })
    ]);

    const queue = this.queueService.getStats();

    return {
      generatedAt: new Date(),
      health,
      users: {
        total: totalUsers,
        active: activeUsers,
        new24h: newUsers24h,
        new7d: newUsers7d,
        admins: adminUsers,
        bySubscription: this.toEnumCountMap(
          usersBySubscription,
          'subscription_status',
          Object.values(SubscriptionStatus)
        )
      },
      records: {
        expenses,
        fuelEntries,
        maintenanceEntries,
        trips,
        vehicles
      },
      operations: {
        auditLogs24h,
        exportJobs: this.toEnumCountMap(
          exportsByStatus,
          'status',
          Object.values(ExportStatus)
        ),
        failedExports24h,
        failedNotifications24h,
        pendingNotifications,
        queue
      },
      feedback: {
        open: feedbackOpen,
        recent: recentFeedback.map((item) => ({
          id: item.id,
          createdAt: item.created_at,
          rating: item.rating,
          status: item.status,
          userId: item.user.id
        }))
      },
      recentUsers: recentUsers.map((user) => ({
        id: user.id,
        createdAt: user.created_at,
        role: user.role,
        subscriptionStatus: user.subscription_status
      }))
    };
  }

  private daysAgo(days: number) {
    const date = new Date();

    date.setUTCDate(date.getUTCDate() - days);

    return date;
  }

  private toEnumCountMap<TItem extends Record<string, unknown>>(
    items: TItem[],
    key: keyof TItem,
    values: string[]
  ) {
    const counts = Object.fromEntries(values.map((value) => [value, 0]));

    for (const item of items) {
      const value = item[key];
      const count = item._count as { _all: number } | undefined;

      if (typeof value === 'string' && count) {
        counts[value] = count._all;
      }
    }

    return counts;
  }
}
