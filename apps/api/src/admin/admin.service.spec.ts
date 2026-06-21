import {
  ExportStatus,
  NotificationStatus,
  SubscriptionStatus
} from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('returns minimum admin overview metrics', async () => {
    const healthService = {
      getReadiness: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: {
          database: { status: 'ok' },
          queue: { status: 'ok' }
        }
      })
    };
    const queueService = {
      getStats: jest.fn().mockReturnValue({
        activeCount: 0,
        concurrency: 2,
        counts: {
          COMPLETED: 1,
          FAILED: 0,
          PENDING: 0,
          PROCESSING: 0
        },
        maxAttempts: 3,
        pendingCount: 0,
        totalCount: 1
      })
    };
    const prisma = {
      auditLog: {
        count: jest.fn().mockResolvedValue(4)
      },
      exportJob: {
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { status: ExportStatus.COMPLETED, _count: { _all: 2 } }
          ])
      },
      expenseEntry: {
        count: jest.fn().mockResolvedValue(5)
      },
      feedback: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            created_at: new Date('2026-06-21T10:00:00.000Z'),
            id: 'feedback_1',
            rating: 4,
            status: 'OPEN',
            user: { id: 'user_1' }
          }
        ])
      },
      fuelEntry: {
        count: jest.fn().mockResolvedValue(6)
      },
      maintenanceEntry: {
        count: jest.fn().mockResolvedValue(7)
      },
      notification: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(0)
      },
      trip: {
        count: jest.fn().mockResolvedValue(8)
      },
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(9)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(1),
        findMany: jest.fn().mockResolvedValue([
          {
            created_at: new Date('2026-06-21T09:00:00.000Z'),
            id: 'user_1',
            role: 'USER',
            subscription_status: SubscriptionStatus.TRIAL
          }
        ]),
        groupBy: jest.fn().mockResolvedValue([
          {
            subscription_status: SubscriptionStatus.TRIAL,
            _count: { _all: 8 }
          }
        ])
      },
      vehicle: {
        count: jest.fn().mockResolvedValue(11)
      }
    };
    const service = new AdminService(
      healthService as never,
      prisma as never,
      queueService as never
    );

    const result = await service.getOverview();

    expect(result.health.status).toBe('ok');
    expect(result.users.total).toBe(10);
    expect(result.users.bySubscription.TRIAL).toBe(8);
    expect(result.users.bySubscription.ACTIVE).toBe(0);
    expect(result.records.trips).toBe(8);
    expect(result.operations.exportJobs.COMPLETED).toBe(2);
    expect(result.operations.exportJobs.FAILED).toBe(0);
    expect(result.operations.pendingNotifications).toBe(3);
    expect(result.feedback.recent[0]).toMatchObject({
      id: 'feedback_1',
      userId: 'user_1'
    });
    expect(result.recentUsers[0]).toMatchObject({
      id: 'user_1',
      subscriptionStatus: SubscriptionStatus.TRIAL
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        status: NotificationStatus.PENDING
      }
    });
  });
});
