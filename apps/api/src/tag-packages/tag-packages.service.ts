import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  PackageAllocationMethod,
  Prisma,
  TagPackage
} from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagPackageDto } from './dto/create-tag-package.dto';
import {
  ListTagPackagesQueryDto,
  TagPackageSortBy
} from './dto/list-tag-packages-query.dto';
import { UpdateTagPackageDto } from './dto/update-tag-package.dto';

@Injectable()
export class TagPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTagPackageDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);
    const startsAt = this.toDate(dto.startsAt);
    const endsAt = this.toDate(dto.endsAt);
    const durationDays = this.resolveDurationDays(
      startsAt,
      endsAt,
      dto.durationDays
    );

    const tagPackage = await this.prisma.tagPackage.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        name: dto.name,
        amount: dto.amount,
        starts_at: startsAt,
        ends_at: endsAt,
        duration_days: durationDays,
        allocation_method:
          dto.allocationMethod ?? PackageAllocationMethod.PER_DAY,
        break_even_target: dto.breakEvenTarget,
        is_active: dto.isActive ?? true,
        note: dto.note
      }
    });

    return this.toTagPackageResponse(tagPackage);
  }

  async findAll(userId: string, query: ListTagPackagesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toTagPackageWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tagPackage.findMany({
        where,
        orderBy: this.toTagPackageOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.tagPackage.count({
        where
      })
    ]);

    return {
      data: items.map((tagPackage) => this.toTagPackageResponse(tagPackage)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const tagPackage = await this.findOwnedTagPackage(userId, id);

    return this.toTagPackageResponse(tagPackage);
  }

  async update(userId: string, id: string, dto: UpdateTagPackageDto) {
    const currentTagPackage = await this.findOwnedTagPackage(userId, id);
    const vehicleId = dto.vehicleId ?? currentTagPackage.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const startsAt =
      dto.startsAt !== undefined
        ? this.toDate(dto.startsAt)
        : currentTagPackage.starts_at;
    const endsAt =
      dto.endsAt !== undefined
        ? this.toDate(dto.endsAt)
        : currentTagPackage.ends_at;
    const durationDays = this.resolveDurationDays(
      startsAt,
      endsAt,
      dto.durationDays ??
        (dto.startsAt !== undefined || dto.endsAt !== undefined
          ? undefined
          : currentTagPackage.duration_days)
    );

    const tagPackage = await this.prisma.tagPackage.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicle.id,
        name: dto.name ?? currentTagPackage.name,
        amount: dto.amount ?? currentTagPackage.amount,
        starts_at: startsAt,
        ends_at: endsAt,
        duration_days: durationDays,
        allocation_method:
          dto.allocationMethod ?? currentTagPackage.allocation_method,
        break_even_target:
          dto.breakEvenTarget !== undefined
            ? dto.breakEvenTarget
            : currentTagPackage.break_even_target,
        is_active:
          dto.isActive !== undefined
            ? dto.isActive
            : currentTagPackage.is_active,
        note: dto.note !== undefined ? dto.note : currentTagPackage.note
      }
    });

    return this.toTagPackageResponse(tagPackage);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedTagPackage(userId, id);

    await this.prisma.tagPackage.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date(),
        is_active: false
      }
    });

    return {
      success: true
    };
  }

  private async findOwnedVehicle(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return vehicle;
  }

  private async findOwnedTagPackage(userId: string, id: string) {
    const tagPackage = await this.prisma.tagPackage.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!tagPackage) {
      throw new NotFoundException('TAG package not found.');
    }

    return tagPackage;
  }

  private toTagPackageWhereInput(
    userId: string,
    query: ListTagPackagesQueryDto
  ) {
    const where: Prisma.TagPackageWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.allocationMethod) {
      where.allocation_method = query.allocationMethod;
    }

    if (query.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const startsAtRange = buildDateRangeFilter(query);

    if (startsAtRange) {
      where.starts_at = startsAtRange;
    }

    if (query.q) {
      where.OR = [
        {
          name: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          note: {
            contains: query.q,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (query.minAmount || query.maxAmount) {
      where.amount = {};

      if (query.minAmount) {
        where.amount.gte = query.minAmount;
      }

      if (query.maxAmount) {
        where.amount.lte = query.maxAmount;
      }
    }

    return where;
  }

  private toTagPackageOrderBy(
    query: ListTagPackagesQueryDto
  ): Prisma.TagPackageOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortBy = query.sortBy ?? TagPackageSortBy.STARTS_AT;
    const fieldBySort: Record<
      TagPackageSortBy,
      keyof Prisma.TagPackageOrderByWithRelationInput
    > = {
      [TagPackageSortBy.AMOUNT]: 'amount',
      [TagPackageSortBy.CREATED_AT]: 'created_at',
      [TagPackageSortBy.ENDS_AT]: 'ends_at',
      [TagPackageSortBy.STARTS_AT]: 'starts_at'
    };

    return [
      {
        [fieldBySort[sortBy]]: direction
      },
      {
        created_at: 'desc'
      }
    ];
  }

  private resolveDurationDays(
    startsAt: Date,
    endsAt: Date,
    explicitDurationDays?: number
  ) {
    if (startsAt > endsAt) {
      throw new BadRequestException('startsAt must be before endsAt.');
    }

    if (explicitDurationDays !== undefined) {
      if (explicitDurationDays < 1) {
        throw new BadRequestException('durationDays must be greater than zero.');
      }

      return explicitDurationDays;
    }

    const startDay = Date.UTC(
      startsAt.getUTCFullYear(),
      startsAt.getUTCMonth(),
      startsAt.getUTCDate()
    );
    const endDay = Date.UTC(
      endsAt.getUTCFullYear(),
      endsAt.getUTCMonth(),
      endsAt.getUTCDate()
    );
    const dayMs = 24 * 60 * 60 * 1000;

    return Math.floor((endDay - startDay) / dayMs) + 1;
  }

  private toDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }

    return date;
  }

  private toTagPackageResponse(tagPackage: TagPackage) {
    return {
      id: tagPackage.id,
      userId: tagPackage.user_id,
      vehicleId: tagPackage.vehicle_id,
      name: tagPackage.name,
      amount: tagPackage.amount.toFixed(2),
      startsAt: tagPackage.starts_at,
      endsAt: tagPackage.ends_at,
      durationDays: tagPackage.duration_days,
      dailyCost:
        tagPackage.duration_days > 0
          ? tagPackage.amount.div(tagPackage.duration_days).toFixed(2)
          : '0.00',
      allocationMethod: tagPackage.allocation_method,
      breakEvenTarget: tagPackage.break_even_target?.toFixed(2) ?? null,
      isActive: tagPackage.is_active,
      note: tagPackage.note,
      createdAt: tagPackage.created_at,
      updatedAt: tagPackage.updated_at
    };
  }
}
