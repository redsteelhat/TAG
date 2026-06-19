import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  Prisma
} from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export interface CreateNotificationInput {
  body: string;
  metadata?: Prisma.InputJsonValue;
  scheduledAt?: Date | null;
  status?: NotificationStatus;
  title: string;
  type: NotificationType;
  userId: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        body: input.body,
        metadata: input.metadata ?? undefined,
        scheduled_at: input.scheduledAt,
        sent_at:
          input.status === NotificationStatus.SENT ? new Date() : undefined,
        status: input.status ?? NotificationStatus.PENDING,
        title: input.title,
        type: input.type,
        user_id: input.userId
      }
    });

    return this.toNotificationResponse(notification);
  }

  async createImmediate(input: Omit<CreateNotificationInput, 'status'>) {
    return this.create({
      ...input,
      status: NotificationStatus.SENT
    });
  }

  async schedule(input: Omit<CreateNotificationInput, 'status'>) {
    return this.create({
      ...input,
      status: NotificationStatus.PENDING
    });
  }

  async findAll(userId: string, query: ListNotificationsQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toNotificationWhereInput(userId, query);
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.notification.count({
        where
      }),
      this.prisma.notification.count({
        where: {
          user_id: userId,
          status: {
            in: [NotificationStatus.PENDING, NotificationStatus.SENT]
          }
        }
      })
    ]);

    return {
      data: items.map((notification) =>
        this.toNotificationResponse(notification)
      ),
      meta: {
        ...buildPaginationMeta(pagination, total),
        unreadCount
      }
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        user_id: userId,
        status: {
          in: [NotificationStatus.PENDING, NotificationStatus.SENT]
        }
      }
    });

    return {
      unreadCount
    };
  }

  async markAsRead(userId: string, id: string) {
    await this.findOwnedNotification(userId, id);

    const notification = await this.prisma.notification.update({
      where: {
        id
      },
      data: {
        read_at: new Date(),
        status: NotificationStatus.READ
      }
    });

    return this.toNotificationResponse(notification);
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        status: {
          in: [NotificationStatus.PENDING, NotificationStatus.SENT]
        }
      },
      data: {
        read_at: new Date(),
        status: NotificationStatus.READ
      }
    });

    return {
      updatedCount: result.count
    };
  }

  async markAsSent(id: string) {
    const notification = await this.prisma.notification.update({
      where: {
        id
      },
      data: {
        sent_at: new Date(),
        status: NotificationStatus.SENT
      }
    });

    return this.toNotificationResponse(notification);
  }

  async markAsFailed(id: string, errorMessage?: string) {
    const notification = await this.prisma.notification.update({
      where: {
        id
      },
      data: {
        metadata: errorMessage ? { errorMessage } : undefined,
        status: NotificationStatus.FAILED
      }
    });

    return this.toNotificationResponse(notification);
  }

  async dispatchDueNotifications(now = new Date()) {
    const dueNotifications = await this.prisma.notification.findMany({
      where: {
        scheduled_at: {
          lte: now
        },
        status: NotificationStatus.PENDING
      },
      orderBy: {
        scheduled_at: 'asc'
      }
    });

    const sentNotifications = await Promise.all(
      dueNotifications.map((notification) => this.markAsSent(notification.id))
    );

    return {
      data: sentNotifications,
      dispatchedCount: sentNotifications.length
    };
  }

  private async findOwnedNotification(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    return notification;
  }

  private toNotificationWhereInput(
    userId: string,
    query: ListNotificationsQueryDto
  ) {
    const where: Prisma.NotificationWhereInput = {
      user_id: userId
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.unreadOnly) {
      where.status = {
        in: [NotificationStatus.PENDING, NotificationStatus.SENT]
      };
    }

    return where;
  }

  private toNotificationResponse(notification: Notification) {
    return {
      id: notification.id,
      type: notification.type,
      status: notification.status,
      title: notification.title,
      body: notification.body,
      scheduledAt: notification.scheduled_at,
      sentAt: notification.sent_at,
      readAt: notification.read_at,
      metadata: notification.metadata,
      createdAt: notification.created_at
    };
  }
}
