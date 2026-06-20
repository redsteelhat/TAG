import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { maskSensitiveData } from '../common/logging/log-masker';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogInput {
  userId?: string;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput) {
    const metadata = input.metadata
      ? (maskSensitiveData(input.metadata) as Prisma.InputJsonObject)
      : Prisma.JsonNull;

    await this.prisma.auditLog.create({
      data: {
        user_id: input.userId,
        actor_id: input.actorId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        ip_address: maskSensitiveData(input.ipAddress, 'ip_address') as
          | string
          | undefined,
        user_agent: maskSensitiveData(input.userAgent, 'user_agent') as
          | string
          | undefined,
        metadata
      }
    });
  }
}
