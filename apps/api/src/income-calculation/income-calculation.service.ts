import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TripIncomeCalculationInput {
  cancellationIncome?: string | Prisma.Decimal | null;
  deadheadKm?: string | Prisma.Decimal | null;
  durationMinutes?: number | null;
  endedAt?: Date | null;
  grossIncome: string | Prisma.Decimal;
  startedAt?: Date | null;
  tipAmount?: string | Prisma.Decimal | null;
  tripKm?: string | Prisma.Decimal | null;
}

export interface TripIncomeCalculationResult {
  allocatedDepreciationCost: Prisma.Decimal;
  allocatedFixedCost: Prisma.Decimal;
  allocatedMaintenanceCost: Prisma.Decimal;
  allocatedOtherVariableCost: Prisma.Decimal;
  allocatedPackageCost: Prisma.Decimal;
  cashNetProfit: Prisma.Decimal;
  durationMinutes: number | null;
  estimatedFuelCost: Prisma.Decimal;
  totalIncome: Prisma.Decimal;
  totalKm: Prisma.Decimal;
  trueNetProfit: Prisma.Decimal;
}

@Injectable()
export class IncomeCalculationService {
  readonly calculationVersion = 'income-calculation-v1';

  constructor(private readonly prisma: PrismaService) {}

  async calculateTripIncome(
    userId: string,
    vehicle: Vehicle,
    input: TripIncomeCalculationInput
  ): Promise<TripIncomeCalculationResult> {
    const zero = new Prisma.Decimal(0);
    const grossIncome = this.toDecimal(input.grossIncome);
    const tipAmount = this.toDecimal(input.tipAmount ?? '0');
    const cancellationIncome = this.toDecimal(input.cancellationIncome ?? '0');
    const tripKm = this.toDecimal(input.tripKm ?? '0');
    const deadheadKm = this.toDecimal(input.deadheadKm ?? '0');
    const totalIncome = grossIncome.plus(tipAmount).plus(cancellationIncome);
    const totalKm = tripKm.plus(deadheadKm);
    const durationMinutes = this.resolveDurationMinutes(
      input.startedAt,
      input.endedAt,
      input.durationMinutes ?? null
    );
    const estimatedFuelCost = await this.calculateEstimatedFuelCost(
      userId,
      vehicle,
      totalKm
    );
    const allocatedPackageCost = zero;
    const allocatedFixedCost = zero;
    const allocatedMaintenanceCost = zero;
    const allocatedDepreciationCost = zero;
    const allocatedOtherVariableCost = zero;
    const cashNetProfit = totalIncome.minus(estimatedFuelCost);
    const trueNetProfit = cashNetProfit
      .minus(allocatedPackageCost)
      .minus(allocatedFixedCost)
      .minus(allocatedMaintenanceCost)
      .minus(allocatedDepreciationCost)
      .minus(allocatedOtherVariableCost);

    return {
      allocatedDepreciationCost,
      allocatedFixedCost,
      allocatedMaintenanceCost,
      allocatedOtherVariableCost,
      allocatedPackageCost,
      cashNetProfit,
      durationMinutes,
      estimatedFuelCost,
      totalIncome,
      totalKm,
      trueNetProfit
    };
  }

  resolveDurationMinutes(
    startedAt?: Date | null,
    endedAt?: Date | null,
    fallback?: number | null
  ) {
    if (!startedAt || !endedAt) {
      return fallback ?? null;
    }

    const durationMinutes = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / 60000
    );

    if (durationMinutes < 0) {
      throw new BadRequestException('Trip end time must be after start time.');
    }

    return durationMinutes;
  }

  async calculateEstimatedFuelCost(
    userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal
  ) {
    if (totalKm.isZero()) {
      return new Prisma.Decimal(0);
    }

    const latestFuelEntry = await this.prisma.fuelEntry.findFirst({
      where: {
        user_id: userId,
        vehicle_id: vehicle.id,
        deleted_at: null
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!latestFuelEntry) {
      return new Prisma.Decimal(0);
    }

    return totalKm
      .mul(vehicle.average_consumption_l_per_100km)
      .div(100)
      .mul(latestFuelEntry.price_per_liter)
      .toDecimalPlaces(2);
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }
}
