import {
  NotificationStatus,
  NotificationType,
  Prisma
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

const notification = {
  body: 'Excel raporun hazir.',
  created_at: new Date('2026-06-19T10:00:00.000Z'),
  id: 'notification_1',
  metadata: {
    exportJobId: 'export_1'
  } as Prisma.JsonObject,
  read_at: null,
  scheduled_at: null,
  sent_at: new Date('2026-06-19T10:00:00.000Z'),
  status: NotificationStatus.SENT,
  title: 'Raporun hazir',
  type: NotificationType.EXPORT_READY,
  user_id: 'user_1'
};

describe('NotificationsService', () => {
  it('creates immediate notifications as sent', async () => {
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(notification)
      }
    };
    const service = new NotificationsService(prisma as never);

    const result = await service.createImmediate({
      body: 'Excel raporun hazir.',
      metadata: {
        exportJobId: 'export_1'
      },
      title: 'Raporun hazir',
      type: NotificationType.EXPORT_READY,
      userId: 'user_1'
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: NotificationStatus.SENT,
        type: NotificationType.EXPORT_READY,
        user_id: 'user_1'
      })
    });
    expect(result.status).toBe(NotificationStatus.SENT);
    expect(result.metadata).toEqual({
      exportJobId: 'export_1'
    });
  });

  it('lists notifications with unread count meta', async () => {
    const prisma = {
      $transaction: jest
        .fn()
        .mockResolvedValue([[notification], 1, 3]),
      notification: {
        count: jest.fn(),
        findMany: jest.fn()
      }
    };
    const service = new NotificationsService(prisma as never);

    const result = await service.findAll('user_1', {
      page: 1,
      pageSize: 20,
      unreadOnly: true
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            in: [NotificationStatus.PENDING, NotificationStatus.SENT]
          },
          user_id: 'user_1'
        }
      })
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.unreadCount).toBe(3);
  });

  it('marks a notification as read', async () => {
    const prisma = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(notification),
        update: jest.fn().mockResolvedValue({
          ...notification,
          read_at: new Date('2026-06-19T10:05:00.000Z'),
          status: NotificationStatus.READ
        })
      }
    };
    const service = new NotificationsService(prisma as never);

    const result = await service.markAsRead('user_1', 'notification_1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: {
        id: 'notification_1'
      },
      data: {
        read_at: expect.any(Date),
        status: NotificationStatus.READ
      }
    });
    expect(result.status).toBe(NotificationStatus.READ);
  });

  it('dispatches due pending notifications', async () => {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...notification,
            scheduled_at: new Date('2026-06-19T09:00:00.000Z'),
            sent_at: null,
            status: NotificationStatus.PENDING
          }
        ]),
        update: jest.fn().mockResolvedValue(notification)
      }
    };
    const service = new NotificationsService(prisma as never);

    const result = await service.dispatchDueNotifications(
      new Date('2026-06-19T10:00:00.000Z')
    );

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: {
        id: 'notification_1'
      },
      data: {
        sent_at: expect.any(Date),
        status: NotificationStatus.SENT
      }
    });
    expect(result.dispatchedCount).toBe(1);
  });
});
