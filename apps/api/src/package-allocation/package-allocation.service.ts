import { Injectable } from '@nestjs/common';
import { PackageAllocationMethod, Prisma, TagPackage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TripPackageAllocationInput {
  currentTripId?: string | null;
  totalKm: Prisma.Decimal | string;
  tripDate: Date;
  userId: string;
  vehicleId: string;
}

export interface PackageAllocationLine {
  allocatedCost: Prisma.Decimal;
  allocationMethod: PackageAllocationMethod;
  packageAmount: Prisma.Decimal;
  packageId: string;
  packageName: string;
  rate: Prisma.Decimal;
}

export interface PackageAllocationResult {
  allocationLines: PackageAllocationLine[];
  totalAllocatedPackageCost: Prisma.Decimal;
}

@Injectable()
export class PackageAllocationService {
  readonly calculationVersion = 'package-allocation-v1';

  constructor(private readonly prisma: PrismaService) {}

  async calculateTripPackageCost(
    input: TripPackageAllocationInput
  ): Promise<PackageAllocationResult> {
    const totalKm = this.toDecimal(input.totalKm);
    const activePackages = await this.findActivePackagesForTrip(input);
    const allocationLines: PackageAllocationLine[] = [];

    for (const tagPackage of activePackages) {
      allocationLines.push(
        await this.calculatePackageLine(tagPackage, {
          ...input,
          totalKm
        })
      );
    }

    return {
      allocationLines,
      totalAllocatedPackageCost: allocationLines.reduce(
        (total, line) => total.plus(line.allocatedCost),
        new Prisma.Decimal(0)
      )
    };
  }

  buildPackageAllocationBreakdown(result: PackageAllocationResult) {
    return {
      totalAllocatedPackageCost:
        result.totalAllocatedPackageCost.toFixed(2),
      lines: result.allocationLines.map((line) => ({
        packageId: line.packageId,
        packageName: line.packageName,
        packageAmount: line.packageAmount.toFixed(2),
        allocationMethod: line.allocationMethod,
        rate: line.rate.toFixed(4),
        allocatedCost: line.allocatedCost.toFixed(2)
      })),
      calculationVersion: this.calculationVersion
    };
  }

  private async findActivePackagesForTrip(input: TripPackageAllocationInput) {
    return this.prisma.tagPackage.findMany({
      where: {
        user_id: input.userId,
        vehicle_id: input.vehicleId,
        is_active: true,
        deleted_at: null,
        starts_at: {
          lte: input.tripDate
        },
        ends_at: {
          gte: input.tripDate
        }
      },
      orderBy: {
        starts_at: 'asc'
      }
    });
  }

  private async calculatePackageLine(
    tagPackage: TagPackage,
    input: Omit<TripPackageAllocationInput, 'totalKm'> & {
      totalKm: Prisma.Decimal;
    }
  ): Promise<PackageAllocationLine> {
    if (tagPackage.allocation_method === PackageAllocationMethod.PER_TRIP) {
      return this.calculatePerTripLine(tagPackage, input);
    }

    if (tagPackage.allocation_method === PackageAllocationMethod.PER_KM) {
      return this.calculatePerKmLine(tagPackage, input);
    }

    return this.calculatePerDayLine(tagPackage);
  }

  private calculatePerDayLine(tagPackage: TagPackage): PackageAllocationLine {
    const divisor = Math.max(tagPackage.duration_days, 1);
    const rate = tagPackage.amount.div(divisor);

    return {
      allocatedCost: rate.toDecimalPlaces(2),
      allocationMethod: tagPackage.allocation_method,
      packageAmount: tagPackage.amount,
      packageId: tagPackage.id,
      packageName: tagPackage.name,
      rate
    };
  }

  private async calculatePerTripLine(
    tagPackage: TagPackage,
    input: Omit<TripPackageAllocationInput, 'totalKm'> & {
      totalKm: Prisma.Decimal;
    }
  ): Promise<PackageAllocationLine> {
    const tripCount = await this.countTripsInPackagePeriod(tagPackage, input);
    const divisor = Math.max(tripCount + 1, 1);
    const rate = tagPackage.amount.div(divisor);

    return {
      allocatedCost: rate.toDecimalPlaces(2),
      allocationMethod: tagPackage.allocation_method,
      packageAmount: tagPackage.amount,
      packageId: tagPackage.id,
      packageName: tagPackage.name,
      rate
    };
  }

  private async calculatePerKmLine(
    tagPackage: TagPackage,
    input: Omit<TripPackageAllocationInput, 'totalKm'> & {
      totalKm: Prisma.Decimal;
    }
  ): Promise<PackageAllocationLine> {
    const periodKm = await this.sumTripKmInPackagePeriod(tagPackage, input);
    const divisor = periodKm.plus(input.totalKm);
    const rate = divisor.gt(0)
      ? tagPackage.amount.div(divisor)
      : new Prisma.Decimal(0);

    return {
      allocatedCost: rate.mul(input.totalKm).toDecimalPlaces(2),
      allocationMethod: tagPackage.allocation_method,
      packageAmount: tagPackage.amount,
      packageId: tagPackage.id,
      packageName: tagPackage.name,
      rate
    };
  }

  private async countTripsInPackagePeriod(
    tagPackage: TagPackage,
    input: Pick<TripPackageAllocationInput, 'currentTripId' | 'userId'>
  ) {
    return this.prisma.trip.count({
      where: {
        id: input.currentTripId
          ? {
              not: input.currentTripId
            }
          : undefined,
        user_id: input.userId,
        vehicle_id: tagPackage.vehicle_id,
        deleted_at: null,
        trip_date: {
          gte: tagPackage.starts_at,
          lte: tagPackage.ends_at
        }
      }
    });
  }

  private async sumTripKmInPackagePeriod(
    tagPackage: TagPackage,
    input: Pick<TripPackageAllocationInput, 'currentTripId' | 'userId'>
  ) {
    const aggregate = await this.prisma.trip.aggregate({
      where: {
        id: input.currentTripId
          ? {
              not: input.currentTripId
            }
          : undefined,
        user_id: input.userId,
        vehicle_id: tagPackage.vehicle_id,
        deleted_at: null,
        trip_date: {
          gte: tagPackage.starts_at,
          lte: tagPackage.ends_at
        }
      },
      _sum: {
        total_km: true
      }
    });

    return aggregate._sum.total_km ?? new Prisma.Decimal(0);
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }
}
