import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional
} from '@nestjs/common';
import { FuelEntry, PaymentMethodType, Prisma } from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { ReportCacheService } from '../reports/report-cache.service';
import { CreateFuelEntryDto } from './dto/create-fuel-entry.dto';
import {
  FuelEntrySortBy,
  ListFuelEntriesQueryDto
} from './dto/list-fuel-entries-query.dto';
import { UpdateFuelEntryDto } from './dto/update-fuel-entry.dto';

@Injectable()
export class FuelEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly reportCache?: ReportCacheService
  ) {}

  async create(userId: string, dto: CreateFuelEntryDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);
    const pricePerLiter = this.resolvePricePerLiter(dto.amount, dto.liters, {
      pricePerLiter: dto.pricePerLiter
    });

    const fuelEntry = await this.prisma.fuelEntry.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        fuel_type: dto.fuelType,
        created_at: dto.createdAt ? this.toDate(dto.createdAt) : undefined,
        amount: dto.amount,
        liters: dto.liters,
        price_per_liter: pricePerLiter,
        odometer_km: dto.odometerKm,
        station_name: dto.stationName,
        city: dto.city,
        district: dto.district,
        full_tank: dto.fullTank ?? false,
        tank_fill_level: dto.tankFillLevel,
        payment_method: dto.paymentMethod,
        receipt_url: dto.receiptUrl
      }
    });

    this.invalidateReportCache(userId);

    return this.toFuelEntryResponse(fuelEntry);
  }

  async findAll(userId: string, query: ListFuelEntriesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toFuelEntryWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelEntry.findMany({
        where,
        orderBy: this.toFuelEntryOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.fuelEntry.count({
        where
      })
    ]);

    return {
      data: items.map((fuelEntry) => this.toFuelEntryResponse(fuelEntry)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const fuelEntry = await this.findOwnedFuelEntry(userId, id);

    return this.toFuelEntryResponse(fuelEntry);
  }

  async update(userId: string, id: string, dto: UpdateFuelEntryDto) {
    const currentFuelEntry = await this.findOwnedFuelEntry(userId, id);
    const vehicleId = dto.vehicleId ?? currentFuelEntry.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const amount = dto.amount ?? currentFuelEntry.amount.toFixed(2);
    const liters = dto.liters ?? currentFuelEntry.liters.toFixed(3);
    const pricePerLiter = this.resolvePricePerLiter(amount, liters, {
      pricePerLiter: dto.pricePerLiter,
      shouldRecalculate: dto.amount !== undefined || dto.liters !== undefined,
      currentPricePerLiter: currentFuelEntry.price_per_liter.toFixed(3)
    });

    const fuelEntry = await this.prisma.fuelEntry.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicle.id,
        fuel_type: dto.fuelType ?? currentFuelEntry.fuel_type,
        created_at:
          dto.createdAt !== undefined
            ? this.toDate(dto.createdAt)
            : currentFuelEntry.created_at,
        amount,
        liters,
        price_per_liter: pricePerLiter,
        odometer_km:
          dto.odometerKm !== undefined
            ? dto.odometerKm
            : currentFuelEntry.odometer_km,
        station_name:
          dto.stationName !== undefined
            ? dto.stationName
            : currentFuelEntry.station_name,
        city: dto.city !== undefined ? dto.city : currentFuelEntry.city,
        district:
          dto.district !== undefined ? dto.district : currentFuelEntry.district,
        full_tank:
          dto.fullTank !== undefined ? dto.fullTank : currentFuelEntry.full_tank,
        tank_fill_level:
          dto.tankFillLevel !== undefined
            ? dto.tankFillLevel
            : currentFuelEntry.tank_fill_level,
        payment_method:
          dto.paymentMethod !== undefined
            ? dto.paymentMethod
            : currentFuelEntry.payment_method,
        receipt_url:
          dto.receiptUrl !== undefined
            ? dto.receiptUrl
            : currentFuelEntry.receipt_url
      }
    });

    this.invalidateReportCache(userId);

    return this.toFuelEntryResponse(fuelEntry);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedFuelEntry(userId, id);

    await this.prisma.fuelEntry.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date()
      }
    });

    this.invalidateReportCache(userId);

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

  private async findOwnedFuelEntry(userId: string, id: string) {
    const fuelEntry = await this.prisma.fuelEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!fuelEntry) {
      throw new NotFoundException('Fuel entry not found.');
    }

    return fuelEntry;
  }

  private toFuelEntryWhereInput(
    userId: string,
    query: ListFuelEntriesQueryDto
  ) {
    const where: Prisma.FuelEntryWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.fuelType) {
      where.fuel_type = query.fuelType;
    }

    if (query.paymentMethod) {
      where.payment_method = query.paymentMethod;
    }

    if (query.fullTank !== undefined) {
      where.full_tank = query.fullTank;
    }

    const createdAtRange = buildDateRangeFilter(query);

    if (createdAtRange) {
      where.created_at = createdAtRange;
    }

    if (query.q) {
      where.OR = [
        {
          station_name: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          city: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          district: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          receipt_url: {
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

    if (query.minLiters || query.maxLiters) {
      where.liters = {};

      if (query.minLiters) {
        where.liters.gte = query.minLiters;
      }

      if (query.maxLiters) {
        where.liters.lte = query.maxLiters;
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

  private toFuelEntryOrderBy(
    query: ListFuelEntriesQueryDto
  ): Prisma.FuelEntryOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortBy = query.sortBy ?? FuelEntrySortBy.CREATED_AT;
    const fieldBySort: Record<
      FuelEntrySortBy,
      keyof Prisma.FuelEntryOrderByWithRelationInput
    > = {
      [FuelEntrySortBy.AMOUNT]: 'amount',
      [FuelEntrySortBy.CREATED_AT]: 'created_at',
      [FuelEntrySortBy.LITERS]: 'liters',
      [FuelEntrySortBy.ODOMETER_KM]: 'odometer_km',
      [FuelEntrySortBy.PRICE_PER_LITER]: 'price_per_liter'
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

  private resolvePricePerLiter(
    amountValue: string,
    litersValue: string,
    options?: {
      currentPricePerLiter?: string;
      pricePerLiter?: string;
      shouldRecalculate?: boolean;
    }
  ) {
    const amount = new Prisma.Decimal(amountValue);
    const liters = new Prisma.Decimal(litersValue);

    if (amount.lte(0)) {
      throw new BadRequestException('Fuel amount must be greater than zero.');
    }

    if (liters.lte(0)) {
      throw new BadRequestException('Fuel liters must be greater than zero.');
    }

    if (options?.pricePerLiter) {
      const pricePerLiter = new Prisma.Decimal(options.pricePerLiter);

      if (pricePerLiter.lte(0)) {
        throw new BadRequestException(
          'Fuel price per liter must be greater than zero.'
        );
      }

      return pricePerLiter.toFixed(3);
    }

    if (!options?.shouldRecalculate && options?.currentPricePerLiter) {
      return options.currentPricePerLiter;
    }

    return amount.div(liters).toFixed(3);
  }

  private toDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid fuel entry date value.');
    }

    return date;
  }

  private invalidateReportCache(userId: string) {
    this.reportCache?.deleteByUser(userId);
  }

  private toFuelEntryResponse(fuelEntry: FuelEntry) {
    return {
      id: fuelEntry.id,
      userId: fuelEntry.user_id,
      vehicleId: fuelEntry.vehicle_id,
      fuelType: fuelEntry.fuel_type,
      amount: fuelEntry.amount.toFixed(2),
      liters: fuelEntry.liters.toFixed(3),
      pricePerLiter: fuelEntry.price_per_liter.toFixed(3),
      odometerKm: fuelEntry.odometer_km?.toFixed(1) ?? null,
      stationName: fuelEntry.station_name,
      city: fuelEntry.city,
      district: fuelEntry.district,
      fullTank: fuelEntry.full_tank,
      tankFillLevel: fuelEntry.tank_fill_level,
      paymentMethod: fuelEntry.payment_method as PaymentMethodType | null,
      receiptUrl: fuelEntry.receipt_url,
      createdAt: fuelEntry.created_at,
      updatedAt: fuelEntry.updated_at
    };
  }
}
