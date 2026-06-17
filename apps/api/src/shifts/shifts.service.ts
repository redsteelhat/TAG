import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, Shift, ShiftStatus } from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ListShiftsQueryDto, ShiftSortBy } from './dto/list-shifts-query.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

interface ShiftCalculationInput {
  endedAt?: Date | null;
  endOdometerKm?: string | Prisma.Decimal | null;
  startedAt: Date;
  startOdometerKm?: string | Prisma.Decimal | null;
}

interface ShiftCalculationResult {
  activeMinutes: number | null;
  totalKm: Prisma.Decimal | null;
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShiftDto) {
    await this.findOwnedVehicle(userId, dto.vehicleId);

    const startedAt = this.toDate(dto.startedAt);
    const endedAt = this.toOptionalDate(dto.endedAt);
    const calculation = this.calculateShift({
      endedAt,
      endOdometerKm: dto.endOdometerKm,
      startedAt,
      startOdometerKm: dto.startOdometerKm
    });
    const shift = await this.prisma.shift.create({
      data: {
        user_id: userId,
        vehicle_id: dto.vehicleId,
        started_at: startedAt,
        ended_at: endedAt,
        start_odometer_km: dto.startOdometerKm,
        end_odometer_km: dto.endOdometerKm,
        total_km: calculation.totalKm,
        active_minutes: calculation.activeMinutes,
        status: dto.status ?? this.resolveStatus(endedAt),
        note: dto.note
      }
    });

    return this.toShiftResponse(shift);
  }

  async findAll(userId: string, query: ListShiftsQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toShiftWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shift.findMany({
        where,
        orderBy: this.toShiftOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.shift.count({
        where
      })
    ]);

    return {
      data: items.map((shift) => this.toShiftResponse(shift)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const shift = await this.findOwnedShift(userId, id);

    return this.toShiftResponse(shift);
  }

  async update(userId: string, id: string, dto: UpdateShiftDto) {
    const currentShift = await this.findOwnedShift(userId, id);
    const vehicleId = dto.vehicleId ?? currentShift.vehicle_id;

    if (dto.vehicleId && dto.vehicleId !== currentShift.vehicle_id) {
      await this.assertVehicleCanChange(userId, id);
    }

    await this.findOwnedVehicle(userId, vehicleId);

    const startedAt =
      dto.startedAt !== undefined
        ? this.toDate(dto.startedAt)
        : currentShift.started_at;
    const endedAt =
      dto.endedAt !== undefined
        ? this.toOptionalDate(dto.endedAt)
        : currentShift.ended_at;
    const startOdometerKm =
      dto.startOdometerKm !== undefined
        ? dto.startOdometerKm
        : currentShift.start_odometer_km;
    const endOdometerKm =
      dto.endOdometerKm !== undefined
        ? dto.endOdometerKm
        : currentShift.end_odometer_km;
    const calculation = this.calculateShift({
      endedAt,
      endOdometerKm,
      startedAt,
      startOdometerKm
    });

    const shift = await this.prisma.shift.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicleId,
        started_at: startedAt,
        ended_at: endedAt,
        start_odometer_km: startOdometerKm,
        end_odometer_km: endOdometerKm,
        total_km: calculation.totalKm,
        active_minutes: calculation.activeMinutes,
        status: dto.status ?? this.resolveStatus(endedAt, currentShift.status),
        note: dto.note ?? currentShift.note
      }
    });

    return this.toShiftResponse(shift);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedShift(userId, id);

    await this.prisma.shift.update({
      where: {
        id
      },
      data: {
        status: ShiftStatus.CANCELED
      }
    });

    return {
      success: true
    };
  }

  async recalculateShiftTotals(userId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id,
        user_id: userId,
        status: {
          not: ShiftStatus.CANCELED
        }
      }
    });

    if (!shift) {
      return;
    }

    const aggregate = await this.prisma.trip.aggregate({
      where: {
        shift_id: id,
        user_id: userId,
        deleted_at: null
      },
      _sum: {
        cash_net_profit: true,
        total_income: true,
        total_km: true,
        true_net_profit: true
      }
    });
    const odometerTotalKm = this.calculateOdometerTotalKm(
      shift.start_odometer_km,
      shift.end_odometer_km
    );

    await this.prisma.shift.update({
      where: {
        id
      },
      data: {
        gross_income: aggregate._sum.total_income ?? new Prisma.Decimal(0),
        cash_net_profit:
          aggregate._sum.cash_net_profit ?? new Prisma.Decimal(0),
        true_net_profit:
          aggregate._sum.true_net_profit ?? new Prisma.Decimal(0),
        total_km:
          odometerTotalKm ?? aggregate._sum.total_km ?? new Prisma.Decimal(0)
      }
    });
  }

  private calculateShift(input: ShiftCalculationInput): ShiftCalculationResult {
    return {
      activeMinutes: this.resolveActiveMinutes(input.startedAt, input.endedAt),
      totalKm: this.calculateOdometerTotalKm(
        input.startOdometerKm,
        input.endOdometerKm
      )
    };
  }

  private calculateOdometerTotalKm(
    startOdometerKm?: string | Prisma.Decimal | null,
    endOdometerKm?: string | Prisma.Decimal | null
  ) {
    if (startOdometerKm === null || startOdometerKm === undefined) {
      return null;
    }

    if (endOdometerKm === null || endOdometerKm === undefined) {
      return null;
    }

    const totalKm = this.toDecimal(endOdometerKm).minus(
      this.toDecimal(startOdometerKm)
    );

    if (totalKm.isNegative()) {
      throw new BadRequestException(
        'Shift end odometer must be greater than start odometer.'
      );
    }

    return totalKm.toDecimalPlaces(1);
  }

  private resolveActiveMinutes(startedAt: Date, endedAt?: Date | null) {
    if (!endedAt) {
      return null;
    }

    const activeMinutes = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / 60000
    );

    if (activeMinutes < 0) {
      throw new BadRequestException('Shift end time must be after start time.');
    }

    return activeMinutes;
  }

  private resolveStatus(endedAt?: Date | null, currentStatus?: ShiftStatus) {
    if (currentStatus === ShiftStatus.CANCELED) {
      return currentStatus;
    }

    if (endedAt) {
      return ShiftStatus.COMPLETED;
    }

    return currentStatus ?? ShiftStatus.ACTIVE;
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

  private async findOwnedShift(userId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id,
        user_id: userId,
        status: {
          not: ShiftStatus.CANCELED
        }
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found.');
    }

    return shift;
  }

  private async assertVehicleCanChange(userId: string, shiftId: string) {
    const tripCount = await this.prisma.trip.count({
      where: {
        user_id: userId,
        shift_id: shiftId,
        deleted_at: null
      }
    });

    if (tripCount > 0) {
      throw new BadRequestException(
        'Shift vehicle cannot be changed after trips are attached.'
      );
    }
  }

  private toShiftWhereInput(userId: string, query: ListShiftsQueryDto) {
    const where: Prisma.ShiftWhereInput = {
      user_id: userId,
      status: query.status ?? {
        not: ShiftStatus.CANCELED
      }
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    const startedAtRange = buildDateRangeFilter(query);

    if (startedAtRange) {
      where.started_at = startedAtRange;
    }

    if (query.q) {
      where.note = {
        contains: query.q,
        mode: 'insensitive'
      };
    }

    if (query.minGrossIncome || query.maxGrossIncome) {
      where.gross_income = {};

      if (query.minGrossIncome) {
        where.gross_income.gte = query.minGrossIncome;
      }

      if (query.maxGrossIncome) {
        where.gross_income.lte = query.maxGrossIncome;
      }
    }

    if (query.minTotalKm || query.maxTotalKm) {
      where.total_km = {};

      if (query.minTotalKm) {
        where.total_km.gte = query.minTotalKm;
      }

      if (query.maxTotalKm) {
        where.total_km.lte = query.maxTotalKm;
      }
    }

    return where;
  }

  private toShiftOrderBy(
    query: ListShiftsQueryDto
  ): Prisma.ShiftOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortBy = query.sortBy ?? ShiftSortBy.STARTED_AT;
    const fieldBySort: Record<
      ShiftSortBy,
      keyof Prisma.ShiftOrderByWithRelationInput
    > = {
      [ShiftSortBy.CREATED_AT]: 'created_at',
      [ShiftSortBy.GROSS_INCOME]: 'gross_income',
      [ShiftSortBy.STARTED_AT]: 'started_at',
      [ShiftSortBy.TOTAL_KM]: 'total_km',
      [ShiftSortBy.TRUE_NET_PROFIT]: 'true_net_profit'
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

  private toDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }

    return date;
  }

  private toOptionalDate(value?: string | null) {
    if (!value) {
      return null;
    }

    return this.toDate(value);
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  private toShiftResponse(shift: Shift) {
    return {
      id: shift.id,
      userId: shift.user_id,
      vehicleId: shift.vehicle_id,
      startedAt: shift.started_at,
      endedAt: shift.ended_at,
      startOdometerKm: shift.start_odometer_km?.toFixed(1) ?? null,
      endOdometerKm: shift.end_odometer_km?.toFixed(1) ?? null,
      totalKm: shift.total_km?.toFixed(1) ?? null,
      activeMinutes: shift.active_minutes,
      status: shift.status,
      grossIncome: shift.gross_income.toFixed(2),
      cashNetProfit: shift.cash_net_profit.toFixed(2),
      trueNetProfit: shift.true_net_profit.toFixed(2),
      calculationVersion: shift.calculation_version,
      note: shift.note,
      createdAt: shift.created_at,
      updatedAt: shift.updated_at
    };
  }
}
