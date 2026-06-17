import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Attachment, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { ListAttachmentsQueryDto } from './dto/list-attachments-query.dto';

@Injectable()
export class AttachmentsService {
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'image/heic',
    'image/heif',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAttachmentDto) {
    this.assertSupportedMimeType(dto.mimeType);
    this.assertSingleParent(dto);
    await this.assertParentOwnership(userId, dto);

    const attachment = await this.prisma.attachment.create({
      data: {
        user_id: userId,
        type: dto.type,
        file_url: dto.fileUrl,
        storage_key: dto.storageKey,
        mime_type: dto.mimeType,
        file_size_bytes: dto.fileSizeBytes,
        original_name: dto.originalName,
        trip_id: dto.tripId,
        expense_entry_id: dto.expenseEntryId,
        fuel_entry_id: dto.fuelEntryId,
        maintenance_entry_id: dto.maintenanceEntryId
      }
    });

    return this.toAttachmentResponse(attachment);
  }

  async findAll(userId: string, query: ListAttachmentsQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toAttachmentWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attachment.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.attachment.count({
        where
      })
    ]);

    return {
      data: items.map((attachment) => this.toAttachmentResponse(attachment)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const attachment = await this.findOwnedAttachment(userId, id);

    return this.toAttachmentResponse(attachment);
  }

  async getSignedUrl(userId: string, id: string) {
    const attachment = await this.findOwnedAttachment(userId, id);

    return {
      id: attachment.id,
      fileUrl: attachment.file_url,
      expiresInSeconds: null,
      isPlaceholder: true,
      storageKey: attachment.storage_key
    };
  }

  async remove(userId: string, id: string) {
    await this.findOwnedAttachment(userId, id);

    await this.prisma.attachment.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date()
      }
    });

    return {
      success: true
    };
  }

  private assertSupportedMimeType(mimeType: string) {
    if (!this.allowedMimeTypes.has(mimeType.toLowerCase())) {
      throw new BadRequestException('Unsupported attachment mime type.');
    }
  }

  private assertSingleParent(dto: CreateAttachmentDto | ListAttachmentsQueryDto) {
    const parentCount = [
      dto.tripId,
      dto.expenseEntryId,
      dto.fuelEntryId,
      dto.maintenanceEntryId
    ].filter(Boolean).length;

    if (parentCount !== 1) {
      throw new BadRequestException(
        'Attachment must be linked to exactly one parent entity.'
      );
    }
  }

  private async assertParentOwnership(userId: string, dto: CreateAttachmentDto) {
    if (dto.tripId) {
      await this.assertTripOwnership(userId, dto.tripId);
      return;
    }

    if (dto.expenseEntryId) {
      await this.assertExpenseOwnership(userId, dto.expenseEntryId);
      return;
    }

    if (dto.fuelEntryId) {
      await this.assertFuelOwnership(userId, dto.fuelEntryId);
      return;
    }

    if (dto.maintenanceEntryId) {
      await this.assertMaintenanceOwnership(userId, dto.maintenanceEntryId);
    }
  }

  private async assertTripOwnership(userId: string, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
  }

  private async assertExpenseOwnership(userId: string, id: string) {
    const expense = await this.prisma.expenseEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!expense) {
      throw new NotFoundException('Expense entry not found.');
    }
  }

  private async assertFuelOwnership(userId: string, id: string) {
    const fuel = await this.prisma.fuelEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!fuel) {
      throw new NotFoundException('Fuel entry not found.');
    }
  }

  private async assertMaintenanceOwnership(userId: string, id: string) {
    const maintenance = await this.prisma.maintenanceEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance entry not found.');
    }
  }

  private async findOwnedAttachment(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }

    return attachment;
  }

  private toAttachmentWhereInput(
    userId: string,
    query: ListAttachmentsQueryDto
  ) {
    const where: Prisma.AttachmentWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.tripId) {
      where.trip_id = query.tripId;
    }

    if (query.expenseEntryId) {
      where.expense_entry_id = query.expenseEntryId;
    }

    if (query.fuelEntryId) {
      where.fuel_entry_id = query.fuelEntryId;
    }

    if (query.maintenanceEntryId) {
      where.maintenance_entry_id = query.maintenanceEntryId;
    }

    return where;
  }

  private toAttachmentResponse(attachment: Attachment) {
    return {
      id: attachment.id,
      type: attachment.type,
      fileUrl: attachment.file_url,
      storageKey: attachment.storage_key,
      mimeType: attachment.mime_type,
      fileSizeBytes: attachment.file_size_bytes,
      originalName: attachment.original_name,
      tripId: attachment.trip_id,
      expenseEntryId: attachment.expense_entry_id,
      fuelEntryId: attachment.fuel_entry_id,
      maintenanceEntryId: attachment.maintenance_entry_id,
      createdAt: attachment.created_at
    };
  }
}
