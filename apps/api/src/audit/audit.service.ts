import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    await this.prisma.auditLog.create({
      data: {
        user_id: input.userId,
        actor_id: input.actorId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        metadata: input.metadata ?? Prisma.JsonNull
      }
    });
  }
}
