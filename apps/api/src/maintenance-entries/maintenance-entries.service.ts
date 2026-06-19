import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AllocationType, MaintenanceEntry, Prisma } from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceEntryDto } from './dto/create-maintenance-entry.dto';
import {
  ListMaintenanceEntriesQueryDto,
  MaintenanceEntrySortBy
} from './dto/list-maintenance-entries-query.dto';
import { UpdateMaintenanceEntryDto } from './dto/update-maintenance-entry.dto';

@Injectable()
export class MaintenanceEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMaintenanceEntryDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);
    const costPerKm = this.calculateCostPerKm(
      dto.amount,
      dto.expectedIntervalKm
    );

    const maintenanceEntry = await this.prisma.maintenanceEntry.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        category: dto.category,
        title: dto.title,
        amount: dto.amount,
        maintenance_date: new Date(dto.maintenanceDate),
        odometer_km: dto.odometerKm,
        expected_interval_km: dto.expectedIntervalKm,
        cost_per_km: costPerKm,
        service_name: dto.serviceName,
        allocation_type: dto.allocationType ?? AllocationType.PER_KM,
        note: dto.note
      }
    });

    return this.toMaintenanceEntryResponse(maintenanceEntry);
  }

  async findAll(userId: string, query: ListMaintenanceEntriesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toMaintenanceEntryWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceEntry.findMany({
        where,
        orderBy: this.toMaintenanceEntryOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.maintenanceEntry.count({
        where
      })
    ]);

    return {
      data: items.map((maintenanceEntry) =>
        this.toMaintenanceEntryResponse(maintenanceEntry)
      ),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const maintenanceEntry = await this.findOwnedMaintenanceEntry(userId, id);

    return this.toMaintenanceEntryResponse(maintenanceEntry);
  }

  async update(userId: string, id: string, dto: UpdateMaintenanceEntryDto) {
    const currentMaintenanceEntry = await this.findOwnedMaintenanceEntry(
      userId,
      id
    );
    const vehicleId = dto.vehicleId ?? currentMaintenanceEntry.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const amount = dto.amount ?? currentMaintenanceEntry.amount.toFixed(2);
    const expectedIntervalKm =
      dto.expectedIntervalKm !== undefined
        ? dto.expectedIntervalKm
        : currentMaintenanceEntry.expected_interval_km?.toFixed(1);
    const costPerKm = this.calculateCostPerKm(amount, expectedIntervalKm);

    const maintenanceEntry = await this.prisma.maintenanceEntry.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicle.id,
        category: dto.category ?? currentMaintenanceEntry.category,
        title: dto.title ?? currentMaintenanceEntry.title,
        amount,
        maintenance_date: dto.maintenanceDate
          ? new Date(dto.maintenanceDate)
          : currentMaintenanceEntry.maintenance_date,
        odometer_km:
          dto.odometerKm !== undefined
            ? dto.odometerKm
            : currentMaintenanceEntry.odometer_km,
        expected_interval_km:
          dto.expectedIntervalKm !== undefined
            ? dto.expectedIntervalKm
            : currentMaintenanceEntry.expected_interval_km,
        cost_per_km: costPerKm,
        service_name:
          dto.serviceName !== undefined
            ? dto.serviceName
            : currentMaintenanceEntry.service_name,
        allocation_type:
          dto.allocationType ?? currentMaintenanceEntry.allocation_type,
        note: dto.note !== undefined ? dto.note : currentMaintenanceEntry.note
      }
    });

    return this.toMaintenanceEntryResponse(maintenanceEntry);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedMaintenanceEntry(userId, id);

    await this.prisma.maintenanceEntry.update({
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

  private async findOwnedMaintenanceEntry(userId: string, id: string) {
    const maintenanceEntry = await this.prisma.maintenanceEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!maintenanceEntry) {
      throw new NotFoundException('Maintenance entry not found.');
    }

    return maintenanceEntry;
  }

  private toMaintenanceEntryWhereInput(
    userId: string,
    query: ListMaintenanceEntriesQueryDto
  ) {
    const where: Prisma.MaintenanceEntryWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.category) {
      where.category = {
        contains: query.category,
        mode: 'insensitive'
      };
    }

    if (query.allocationType) {
      where.allocation_type = query.allocationType;
    }

    const maintenanceDateRange = buildDateRangeFilter(query);

    if (maintenanceDateRange) {
      where.maintenance_date = maintenanceDateRange;
    }

    if (query.q) {
      where.OR = [
        {
          category: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          title: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          service_name: {
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

    if (query.minOdometerKm || query.maxOdometerKm) {
      where.odometer_km = {};

      if (query.minOdometerKm) {
        where.odometer_km.gte = query.minOdometerKm;
      }

      if (query.maxOdometerKm) {
        where.odometer_km.lte = query.maxOdometerKm;
      }
    }

    return where;
  }

  private toMaintenanceEntryOrderBy(
    query: ListMaintenanceEntriesQueryDto
  ): Prisma.MaintenanceEntryOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortBy = query.sortBy ?? MaintenanceEntrySortBy.MAINTENANCE_DATE;
    const fieldBySort: Record<
      MaintenanceEntrySortBy,
      keyof Prisma.MaintenanceEntryOrderByWithRelationInput
    > = {
      [MaintenanceEntrySortBy.AMOUNT]: 'amount',
      [MaintenanceEntrySortBy.COST_PER_KM]: 'cost_per_km',
      [MaintenanceEntrySortBy.CREATED_AT]: 'created_at',
      [MaintenanceEntrySortBy.MAINTENANCE_DATE]: 'maintenance_date',
      [MaintenanceEntrySortBy.ODOMETER_KM]: 'odometer_km'
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

  private calculateCostPerKm(amountValue: string, expectedIntervalKm?: string) {
    const amount = new Prisma.Decimal(amountValue);

    if (amount.lte(0)) {
      throw new BadRequestException('Maintenance amount must be greater than zero.');
    }

    if (!expectedIntervalKm) {
      return null;
    }

    const intervalKm = new Prisma.Decimal(expectedIntervalKm);

    if (intervalKm.lte(0)) {
      throw new BadRequestException(
        'Maintenance interval km must be greater than zero.'
      );
    }

    return amount.div(intervalKm).toDecimalPlaces(4).toFixed(4);
  }

  private toMaintenanceEntryResponse(maintenanceEntry: MaintenanceEntry) {
    return {
      id: maintenanceEntry.id,
      userId: maintenanceEntry.user_id,
      vehicleId: maintenanceEntry.vehicle_id,
      category: maintenanceEntry.category,
      title: maintenanceEntry.title,
      amount: maintenanceEntry.amount.toFixed(2),
      maintenanceDate: maintenanceEntry.maintenance_date,
      odometerKm: maintenanceEntry.odometer_km?.toFixed(1) ?? null,
      expectedIntervalKm:
        maintenanceEntry.expected_interval_km?.toFixed(1) ?? null,
      costPerKm: maintenanceEntry.cost_per_km?.toFixed(4) ?? null,
      serviceName: maintenanceEntry.service_name,
      allocationType: maintenanceEntry.allocation_type,
      note: maintenanceEntry.note,
      createdAt: maintenanceEntry.created_at,
      updatedAt: maintenanceEntry.updated_at
    };
  }
}
